import { createHash } from 'node:crypto'
import { z } from 'zod/v4'

const identifier = z.string().trim().min(1).max(256)
const callSchema = z.object({
  id: identifier, provider: identifier, capability: identifier,
  input: z.record(z.string(), z.json()), creditsEstimate: z.number().finite().nonnegative(),
})
const approvalSchema = z.object({
  kind: z.literal('calls').default('calls'), id: identifier, reason: z.string(), calls: z.array(callSchema).min(1).max(30),
}).refine(approval => new Set(approval.calls.map(call => call.id)).size === approval.calls.length, 'Duplicate call IDs')
const turnSchema = z.object({
  success: z.literal(true), status: z.literal('completed'), threadId: identifier, pendingApproval: approvalSchema,
})
export const reviewSchema = z.object({
  threadId: identifier, externalId: identifier, approval: approvalSchema,
  maxCredits: z.number().int().positive(), expiresAt: z.number().finite(),
  question: z.string().min(1).max(500), binding: identifier,
  phase: z.enum(['pending', 'submitting', 'submitted', 'uncertain']),
  decisionId: identifier.nullable(), jobId: identifier.nullable(),
})
export type Review = Readonly<z.infer<typeof reviewSchema>>
export type ReviewPorts = {
  readDecision: (id: string) => Promise<unknown>
  continueAgent: (body: Continuation) => Promise<unknown>
}
export interface ReviewStore {
  load(): Promise<Review | null>
  save(review: Review): Promise<void>
  attach(decisionId: string): Promise<void>
  claim(binding: string): Promise<boolean>
  finish(phase: 'submitted' | 'uncertain', jobId: string | null): Promise<void>
}
const decisionSchema = z.object({
  decisionId: identifier, externalId: identifier, context: identifier,
  type: z.literal('confirm'), question: z.string(),
  status: z.enum(['pending', 'answered', 'expired', 'cancelled', 'stopped']),
  answered: z.boolean(), value: z.enum(['yes', 'no']).nullable(),
  expiresAt: z.string().datetime(), answeredAt: z.string().datetime().nullable(),
})
export const jobSchema = z.object({ success: z.literal(true), id: identifier })
type Decision = z.infer<typeof decisionSchema>
type Continuation = Readonly<{
  threadId: string; mode: 'chat'; prompt: string; maxCredits: number
  exchange: {
    enabled: true; requireApproval: true; onTermsRequired: 'ask'; maxCalls: number; toolkits: string[]
    approve?: { approvalId: string; callIds: string[] }; decline?: { approvalId: string }
  }
}>
export type ResumeResult = { outcome: 'waiting' | 'busy' } | { outcome: 'submitted'; jobId: string }

function reviewFingerprint(review: Pick<Review, 'threadId' | 'externalId' | 'approval' | 'maxCredits' | 'expiresAt' | 'question'>): string {
  return createHash('sha256').update(JSON.stringify({
    threadId: review.threadId, externalId: review.externalId, approval: review.approval,
    maxCredits: review.maxCredits, expiresAt: review.expiresAt, question: review.question,
  })).digest('hex')
}
export function parseReview(input: unknown): Review {
  const review = reviewSchema.parse(input)
  if (review.binding !== reviewFingerprint(review)) throw new Error('Saved review inputs changed')
  return review
}
export function prepareReview(input: unknown, externalId: string, maxCredits: number, now: number): Review {
  const turn = turnSchema.parse(input)
  const estimate = turn.pendingApproval.calls.reduce((sum, call) => sum + call.creditsEstimate, 0)
  if (!Number.isFinite(estimate) || estimate > maxCredits) throw new Error('Provider estimate exceeds the per-turn credit budget')
  const descriptions = turn.pendingApproval.calls.map(call => `${call.provider}/${call.capability} ${JSON.stringify(call.input)} (${call.creditsEstimate} credits)`)
  const question = `Approve paid data calls? Estimated ${estimate} Firecrawl credits. ${descriptions.join('; ')}`
  if (question.length > 500) throw new Error('Call details exceed the demo review surface; use a full authenticated review screen')
  const review = {
    threadId: turn.threadId, externalId, approval: turn.pendingApproval, maxCredits,
    expiresAt: now + 15 * 60_000, question,
  }
  return parseReview({ ...review, binding: reviewFingerprint(review), phase: 'pending', decisionId: null, jobId: null })
}
function validateDecision(review: Review, input: unknown): Decision {
  const decision = decisionSchema.parse(input)
  if (decision.decisionId !== review.decisionId || decision.externalId !== review.externalId ||
    decision.context !== review.binding || decision.question !== review.question) throw new Error('Decision does not match the saved review')
  if (decision.answered !== (decision.status === 'answered')) throw new Error('Inconsistent decision status')
  if (decision.answered && (!decision.answeredAt || decision.value === null)) throw new Error('Missing answer')
  return decision
}
function continuationFor(review: Review, decision: Decision, now: number): Continuation | null {
  if (decision.answeredAt && Date.parse(decision.answeredAt) > now) throw new Error('Answer timestamp is in the future')
  const deadline = Math.min(review.expiresAt, Date.parse(decision.expiresAt))
  if (decision.status === 'pending' && now < deadline) return null
  const approved = decision.status === 'answered' && decision.value === 'yes' &&
    decision.answeredAt !== null && Date.parse(decision.answeredAt) <= deadline && now < deadline
  return {
    threadId: review.threadId, mode: 'chat', prompt: 'Continue with the recorded human decision.', maxCredits: review.maxCredits,
    exchange: {
      enabled: true, requireApproval: true, onTermsRequired: 'ask', maxCalls: review.approval.calls.length,
      toolkits: [...new Set(review.approval.calls.map(call => call.provider))],
      ...(approved ? { approve: { approvalId: review.approval.id, callIds: review.approval.calls.map(call => call.id) } }
        : { decline: { approvalId: review.approval.id } }),
    },
  }
}
export async function resumeReview(store: ReviewStore, ports: ReviewPorts, now: number): Promise<ResumeResult> {
  const review = await store.load()
  if (!review?.decisionId) throw new Error('Create a decision before resuming')
  if (review.phase === 'submitted' && review.jobId) return { outcome: 'submitted', jobId: review.jobId }
  if (review.phase !== 'pending') throw new Error('Continuation outcome is uncertain; reconcile Firecrawl history before any retry')
  const decision = validateDecision(review, await ports.readDecision(review.decisionId))
  const body = continuationFor(review, decision, now)
  if (!body) return { outcome: 'waiting' }
  if (!await store.claim(review.binding)) return { outcome: 'busy' }
  try {
    const job = jobSchema.parse(await ports.continueAgent(body))
    await store.finish('submitted', job.id)
    return { outcome: 'submitted', jobId: job.id }
  } catch (error) {
    await store.finish('uncertain', null)
    throw error
  }
}
