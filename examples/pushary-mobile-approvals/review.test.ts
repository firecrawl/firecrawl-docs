import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createFileStore } from './store'
import { prepareReview, resumeReview, type ReviewPorts } from './review'

const turn = {
  success: true, status: 'completed', threadId: 'thread-1',
  pendingApproval: { kind: 'calls', id: 'approval-1', reason: 'Company research', calls: [
    { id: 'call-1', provider: 'apollo', capability: 'companies/enrich', input: { domain: 'firecrawl.dev' }, creditsEstimate: 30 },
  ] },
}
const now = Date.parse('2026-10-16T12:00:00Z')
const directories: string[] = []
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'firecrawl-review-test-'))
  directories.push(directory)
  const store = createFileStore(directory)
  const review = prepareReview(turn, 'customer-1', 50, now)
  await store.save(review)
  await store.attach('decision-1')
  const decision: Record<string, unknown> = {
    decisionId: 'decision-1', externalId: 'customer-1', context: review.binding,
    type: 'confirm', question: review.question, status: 'answered', answered: true, value: 'yes',
    expiresAt: '2026-10-16T12:15:00Z', answeredAt: '2026-10-16T12:01:00Z',
  }
  const submitted: unknown[] = []
  const ports: ReviewPorts = {
    readDecision: async () => decision,
    continueAgent: async body => { submitted.push(body); return { success: true, id: 'job-2' } },
  }
  return { directory, store, review, decision, submitted, ports }
}
afterEach(async () => { await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))) })

describe('Firecrawl mobile paid-call review', () => {
  it('binds the displayed inputs to the exact thread, recipient and paid calls', () => {
    const review = prepareReview(turn, 'customer-1', 50, now)
    expect(review.question).toContain('firecrawl.dev')
    expect(review.question).toContain('30')
    expect(review.binding).not.toBe(prepareReview(turn, 'customer-2', 50, now).binding)
    expect(() => prepareReview({ ...turn, pendingApproval: { kind: 'terms' } }, 'customer-1', 50, now)).toThrow()
  })

  it.each([null, {}, { ...turn, status: 'processing' }, {
    ...turn, pendingApproval: { ...turn.pendingApproval, calls: [{ ...turn.pendingApproval.calls[0], creditsEstimate: -1 }] },
  }])('rejects malformed or unfinished provider output', input => {
    expect(() => prepareReview(input, 'customer-1', 50, now)).toThrow()
  })

  it('rejects estimates above the configured per-turn credit budget', () => {
    expect(() => prepareReview(turn, 'customer-1', 20, now)).toThrow()
  })

  it('accepts the live calls response that omits kind but includes typed paid calls', () => {
    const { kind: _kind, ...approval } = turn.pendingApproval
    expect(prepareReview({ ...turn, pendingApproval: { ...approval, resolution: null } }, 'customer-1', 50, now).approval.kind).toBe('calls')
  })

  it('rejects a future-dated human answer', async () => {
    const { store, ports, submitted } = await fixture()
    await expect(resumeReview(store, ports, now)).rejects.toThrow()
    expect(submitted).toEqual([])
  })

  it('approves only reviewed calls, preserves the gate, and persists the continuation job', async () => {
    const { store, ports, submitted } = await fixture()
    expect(await resumeReview(store, ports, now + 120_000)).toEqual({ outcome: 'submitted', jobId: 'job-2' })
    expect(submitted).toEqual([{
      threadId: 'thread-1', mode: 'chat', prompt: 'Continue with the recorded human decision.', maxCredits: 50,
      exchange: { enabled: true, requireApproval: true, onTermsRequired: 'ask', maxCalls: 1,
        toolkits: ['apollo'], approve: { approvalId: 'approval-1', callIds: ['call-1'] } },
    }])
    expect((await store.load())?.phase).toBe('submitted')
    expect(await resumeReview(store, ports, now + 120_000)).toEqual({ outcome: 'submitted', jobId: 'job-2' })
    expect(submitted).toHaveLength(1)
  })

  it.each(['no', null])('never treats answer %s as approval', async value => {
    const { store, ports, decision, submitted } = await fixture()
    decision.value = value
    if (value === null) {
      decision.status = 'pending'; decision.answered = false
      expect(await resumeReview(store, ports, now + 120_000)).toEqual({ outcome: 'waiting' })
      expect(submitted).toEqual([])
    } else {
      await resumeReview(store, ports, now + 120_000)
      expect(submitted).toMatchObject([{ exchange: { decline: { approvalId: 'approval-1' } } }])
      expect(submitted[0]).not.toHaveProperty('exchange.approve')
    }
  })

  it('declines an expired approval even if the saved answer says yes', async () => {
    const { store, ports, submitted } = await fixture()
    await resumeReview(store, ports, now + 3_600_000)
    expect(submitted).toMatchObject([{ exchange: { decline: { approvalId: 'approval-1' } } }])
  })

  it('rejects answers for another recipient or action', async () => {
    const { store, ports, decision, submitted } = await fixture()
    decision.externalId = 'someone-else'
    await expect(resumeReview(store, ports, now)).rejects.toThrow()
    expect(submitted).toEqual([])
    decision.externalId = 'customer-1'; decision.context = 'different-inputs'
    await expect(resumeReview(store, ports, now)).rejects.toThrow()
    expect(submitted).toEqual([])
  })

  it('allows only one concurrent continuation', async () => {
    const { store, ports, submitted } = await fixture()
    await Promise.allSettled([resumeReview(store, ports, now + 120_000), resumeReview(store, ports, now + 120_000)])
    expect(submitted).toHaveLength(1)
  })

  it('never automatically retries an ambiguous continuation after reopening the store', async () => {
    const { store, directory, ports, submitted } = await fixture()
    ports.continueAgent = async body => { submitted.push(body); throw new Error('Connection lost after acceptance') }
    await expect(resumeReview(store, ports, now + 120_000)).rejects.toThrow()
    await expect(resumeReview(createFileStore(directory), ports, now + 120_000)).rejects.toThrow()
    expect(submitted).toHaveLength(1)
  })

  it('does not overwrite an existing review with changed inputs', async () => {
    const { store } = await fixture()
    await expect(store.save(prepareReview(turn, 'customer-2', 50, now))).rejects.toThrow()
  })
})
