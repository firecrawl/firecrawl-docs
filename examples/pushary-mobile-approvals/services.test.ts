import { describe, expect, it } from 'vitest'
import { createServices } from './services'

describe('HTTP boundaries', () => {
  it('sends the selected account credentials only to their matching API', async () => {
    const requests: { url: string; authorization: string | null; body: unknown }[] = []
    const fetcher: typeof fetch = async (url, init) => {
      requests.push({ url: String(url), authorization: new Headers(init?.headers).get('Authorization'), body: init?.body ? JSON.parse(String(init.body)) : null })
      return new Response(JSON.stringify({ success: true, id: 'job-1' }))
    }
    const services = createServices('firecrawl-secret', 'pushary-secret', fetcher)
    await services.firecrawl('/agent', { prompt: 'Research', maxCredits: 50 })
    await services.pushary('/decisions/decision-1')
    expect(requests).toEqual([
      { url: 'https://api.firecrawl.dev/v2/agent', authorization: 'Bearer firecrawl-secret', body: { prompt: 'Research', maxCredits: 50 } },
      { url: 'https://pushary.com/api/v1/server/decisions/decision-1', authorization: 'Bearer pushary-secret', body: null },
    ])
  })
  it('does not retry or expose a provider error body on a failed paid request', async () => {
    let attempts = 0
    const fetcher: typeof fetch = async () => { attempts += 1; return new Response('private upstream details', { status: 502 }) }
    const services = createServices('secret', 'secret', fetcher)
    await expect(services.firecrawl('/agent', { prompt: 'Research' })).rejects.toThrow('Firecrawl HTTP 502')
    expect(attempts).toBe(1)
  })
})
