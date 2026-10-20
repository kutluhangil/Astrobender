interface ApiRequest {
  method?: string
}

interface ApiResponse {
  setHeader(name: string, value: string): void
  status(code: number): ApiResponse
  json(body: unknown): void
}

type ProbeState = 'up' | 'down'

interface ProbeResult {
  state: ProbeState
  latencyMs: number
  detail: string
}

const PROBE_TIMEOUT_MS = 4_000

/**
 * Reachability probes for the upstreams the proxies depend on. They are
 * deliberately cheap: CelesTrak asks clients not to re-download GP data
 * between updates, so its probe is a HEAD on the home page rather than a GP
 * query, and the JPL probe asks for a one-day window that is almost always
 * empty.
 */
const PROBES = {
  celestrak: { url: 'https://celestrak.org/', method: 'HEAD' },
  jplCad: {
    url: 'https://ssd-api.jpl.nasa.gov/cad.api?date-min=now&date-max=%2B1&dist-max=0.0001',
    method: 'GET',
  },
} as const

type ProbeName = keyof typeof PROBES

async function probe(name: ProbeName): Promise<ProbeResult> {
  const { url, method } = PROBES[name]
  const started = Date.now()
  try {
    const response = await fetch(url, {
      method,
      headers: { 'User-Agent': 'ASTROBENDER/1.0 (health)' },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    const latencyMs = Date.now() - started
    if (method === 'GET') await response.body?.cancel()
    return response.ok
      ? { state: 'up', latencyMs, detail: `HTTP ${response.status}` }
      : { state: 'down', latencyMs, detail: `HTTP ${response.status} ${response.statusText}` }
  } catch (error) {
    return {
      state: 'down',
      latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.status(405).json({ error: `Method ${request.method ?? 'unknown'} is not allowed` })
    return
  }

  const names = Object.keys(PROBES) as ProbeName[]
  const results = await Promise.all(names.map((name) => probe(name)))
  const upstreams = Object.fromEntries(names.map((name, index) => [name, results[index]])) as Record<
    ProbeName,
    ProbeResult
  >
  const down = results.filter((result) => result.state === 'down').length

  // The app itself is up whenever this function answers; upstream outages
  // degrade live data but the bundled snapshots keep it usable.
  response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=60')
  response.status(200).json({
    status: down === 0 ? 'ok' : 'degraded',
    service: 'astrobender',
    generatedAt: new Date().toISOString(),
    revision: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    upstreams,
  })
}
