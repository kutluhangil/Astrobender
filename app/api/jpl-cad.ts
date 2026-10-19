interface ApiRequest {
  method?: string
  url?: string
}

interface ApiResponse {
  setHeader(name: string, value: string): void
  status(code: number): ApiResponse
  json(body: unknown): void
}

const JPL_CAD_URL =
  'https://ssd-api.jpl.nasa.gov/cad.api?date-min=now&date-max=%2B60&dist-max=0.2&diameter=true&fullname=true&sort=date'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.status(405).json({ error: `Method ${request.method ?? 'unknown'} is not allowed` })
    return
  }

  // The upstream query is fixed, so any query string here is dead weight —
  // and because the CDN caches per full URL, accepting arbitrary ones would
  // let `?1`, `?2`, `?3`… each miss the cache and trigger a fresh function
  // invocation plus an outbound request to JPL from this deployment's IP.
  // Rejecting them keeps exactly one cacheable URL.
  if ((request.url ?? '').includes('?')) {
    response.status(400).json({ error: 'jpl-cad accepts no query parameters' })
    return
  }

  let upstream: Response
  try {
    upstream = await fetch(JPL_CAD_URL, {
      headers: { Accept: 'application/json', 'User-Agent': 'ASTROBENDER/1.0' },
      signal: AbortSignal.timeout(10_000),
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    response.status(504).json({ error: `JPL CAD request failed after 10000 ms: ${detail}` })
    return
  }
  if (!upstream.ok) {
    const body = (await upstream.text()).replace(/\s+/g, ' ').slice(0, 180)
    response.status(502).json({
      error: `JPL CAD returned HTTP ${upstream.status} ${upstream.statusText}${body ? ` — ${body}` : ''}`,
    })
    return
  }

  const text = await upstream.text()
  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    response.status(502).json({
      error: `JPL CAD returned invalid JSON (${detail}) — ${text.replace(/\s+/g, ' ').slice(0, 180)}`,
    })
    return
  }
  // An empty window comes back as `{"count":0}` with no fields table; anything
  // else without one is an upstream error shape, not data.
  const record = typeof payload === 'object' && payload !== null
    ? (payload as Record<string, unknown>)
    : null
  if (record === null || (!('fields' in record) && Number(record.count) !== 0)) {
    response.status(502).json({
      error: `JPL CAD returned no fields table — ${text.replace(/\s+/g, ' ').slice(0, 180)}`,
    })
    return
  }
  response.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600')
  response.status(200).json(payload)
}
