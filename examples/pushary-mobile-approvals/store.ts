import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { parseReview, type Review, type ReviewStore } from './review'

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
export function createFileStore(directory: string): ReviewStore {
  const path = join(directory, 'review.json')
  async function load(): Promise<Review | null> {
    try { return parseReview(JSON.parse(await readFile(path, 'utf8'))) }
    catch (error) { if (isMissing(error)) return null; throw error }
  }
  async function change(update: (current: Review | null) => Review): Promise<void> {
    await mkdir(directory, { recursive: true, mode: 0o700 })
    const lock = await open(join(directory, 'review.lock'), 'wx', 0o600)
    try {
      const next = parseReview(update(await load()))
      const temporary = await open(`${path}.tmp`, 'w', 0o600)
      try { await temporary.writeFile(JSON.stringify(next)); await temporary.sync() }
      finally { await temporary.close() }
      await rename(`${path}.tmp`, path)
      const parent = await open(directory, 'r')
      try { await parent.sync() } finally { await parent.close() }
    } finally { await lock.close(); await unlink(join(directory, 'review.lock')) }
  }
  async function save(review: Review): Promise<void> {
    function insert(current: Review | null): Review {
      if (current && current.binding !== review.binding) throw new Error('Conflicting review; use a new directory for a new approval')
      return current ?? review
    }
    await change(insert)
  }
  async function attach(decisionId: string): Promise<void> {
    function attachDecision(current: Review | null): Review {
      if (!current || (current.decisionId && current.decisionId !== decisionId)) throw new Error('Conflicting decision ID')
      return { ...current, decisionId }
    }
    await change(attachDecision)
  }
  async function claim(binding: string): Promise<boolean> {
    let claimed = false
    function claimPending(current: Review | null): Review {
      if (!current || current.binding !== binding) throw new Error('Review binding changed')
      if (current.phase !== 'pending') return current
      claimed = true
      return { ...current, phase: 'submitting' }
    }
    await change(claimPending)
    return claimed
  }
  async function finish(phase: 'submitted' | 'uncertain', jobId: string | null): Promise<void> {
    function finishSubmission(current: Review | null): Review {
      if (!current || current.phase !== 'submitting') throw new Error('No continuation is being submitted')
      return { ...current, phase, jobId }
    }
    await change(finishSubmission)
  }
  return { load, save, attach, claim, finish }
}
