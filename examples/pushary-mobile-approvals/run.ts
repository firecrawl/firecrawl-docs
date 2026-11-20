import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod/v4'
import { jobSchema, prepareReview, resumeReview } from './review'
import { createFileStore } from './store'
import { createServices } from './services'

const [command, directory, ...words] = process.argv.slice(2)
const identifier = z.string().min(1).max(256)
const provider = identifier.parse(process.env.FIRECRAWL_PROVIDER ?? 'apps-apple-com')
const maxCredits = z.coerce.number().int().positive().parse(process.env.MAX_CREDITS ?? '50')
const services = createServices(process.env.FIRECRAWL_API_KEY ?? '', process.env.PUSHARY_API_KEY ?? '')
const statusSchema = z.object({
  success: z.literal(true), status: z.enum(['processing', 'completed', 'failed']),
  threadId: identifier.optional(), creditsUsed: z.number().optional(), pendingApproval: z.unknown().optional(),
  exchange: z.object({ paidCalls: z.number().optional(), creditsUsed: z.number().optional() }).passthrough().optional(),
}).passthrough()

async function readJson(name: string): Promise<unknown> {
  return JSON.parse(await readFile(join(directory, name), 'utf8'))
}
async function saveJson(name: string, value: unknown): Promise<void> {
  await writeFile(join(directory, name), JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' })
}
async function start(): Promise<void> {
  const prompt = z.string().min(1).parse(words.join(' '))
  await saveJson('start-intent.json', { prompt, provider, maxCredits, createdAt: new Date().toISOString() })
  const job = jobSchema.parse(await services.firecrawl('/agent', {
    prompt, mode: 'chat', maxCredits,
    exchange: { enabled: true, toolkits: [provider], maxCalls: 1, requireApproval: true, onTermsRequired: 'ask' },
  }))
  await saveJson('job.json', job)
  console.log(JSON.stringify({ jobId: job.id, next: 'check' }))
}
async function check(): Promise<void> {
  const store = createFileStore(join(directory, 'review'))
  const review = await store.load()
  const job = review?.jobId ? { id: review.jobId } : jobSchema.parse(await readJson('job.json'))
  const status = statusSchema.parse(await services.firecrawl(`/agent/${encodeURIComponent(job.id)}`))
  console.log(JSON.stringify({ status: status.status, agentCreditsUsed: status.creditsUsed, exchange: status.exchange, pendingApproval: status.pendingApproval ?? null }))
  if (status.status === 'completed') {
    await writeFile(join(directory, 'turn.json'), JSON.stringify(status, null, 2), { mode: 0o600 })
    console.log(status.pendingApproval
      ? 'Saved turn.json. Use request for a calls approval; terms require separate review and consent.'
      : 'Saved the completed result to turn.json.')
  }
}
async function request(): Promise<void> {
  const externalId = identifier.parse(process.env.PUSHARY_EXTERNAL_ID)
  const store = createFileStore(join(directory, 'review'))
  let review = await store.load()
  if (!review) {
    review = prepareReview(await readJson('turn.json'), externalId, maxCredits, Date.now())
    await store.save(review)
  }
  if (review.externalId !== externalId) throw new Error('Recipient differs from saved review')
  if (review.phase !== 'pending' || review.expiresAt <= Date.now()) throw new Error('Review is no longer pending or has expired')
  if (review.decisionId) { console.log(JSON.stringify({ decisionId: review.decisionId, next: 'resume' })); return }
  const created = z.object({ decisionId: identifier }).parse(await services.pushary('/decisions', {
    externalId: review.externalId, type: 'confirm', question: review.question, context: review.binding,
    agentName: 'Firecrawl research demo', toolName: 'firecrawl.alexandria', toolTarget: review.approval.id,
    idempotencyKey: review.binding, expiresInSeconds: 900, requireReachable: true, wait: false,
  }))
  await store.attach(created.decisionId)
  console.log(JSON.stringify({ decisionId: created.decisionId, next: 'resume' }))
}
async function resume(): Promise<void> {
  const store = createFileStore(join(directory, 'review'))
  async function readDecision(id: string): Promise<unknown> { return services.pushary(`/decisions/${encodeURIComponent(id)}`) }
  async function continueAgent(body: unknown): Promise<unknown> { return services.firecrawl('/agent', body) }
  console.log(JSON.stringify(await resumeReview(store, { readDecision, continueAgent }, Date.now())))
}
async function main(): Promise<void> {
  if (!directory || !['start', 'check', 'request', 'resume'].includes(command)) {
    throw new Error('Usage: npm run demo -- <start|check|request|resume> /private/run-directory [research prompt]')
  }
  await mkdir(directory, { recursive: true, mode: 0o700 })
  if (command === 'start') return start()
  if (command === 'check') return check()
  if (command === 'request') return request()
  return resume()
}
function reportFailure(error: unknown): void {
  console.error(error instanceof z.ZodError ? 'Invalid response or configuration; inspect private run files and API contracts.' : error instanceof Error ? error.message : 'Demo failed')
  process.exitCode = 1
}
main().catch(reportFailure)
