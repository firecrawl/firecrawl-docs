export interface Services {
  firecrawl(path: string, body?: unknown): Promise<unknown>
  pushary(path: string, body?: unknown): Promise<unknown>
}
export function createServices(firecrawlKey: string, pusharyKey: string, fetcher: typeof fetch = fetch): Services {
  async function request(origin: string, label: string, key: string, path: string, body?: unknown): Promise<unknown> {
    if (!key) throw new Error(`Missing ${label} API key`)
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid API path')
    const response = await fetcher(`${origin}${path}`, {
      method: body === undefined ? 'GET' : 'POST', redirect: 'error',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) throw new Error(`${label} HTTP ${response.status}; inspect account activity before retrying a mutation`)
    return response.json()
  }
  async function firecrawl(path: string, body?: unknown): Promise<unknown> {
    return request('https://api.firecrawl.dev/v2', 'Firecrawl', firecrawlKey, path, body)
  }
  async function pushary(path: string, body?: unknown): Promise<unknown> {
    return request('https://pushary.com/api/v1/server', 'Pushary', pusharyKey, path, body)
  }
  return { firecrawl, pushary }
}
