interface ApiRequest {
  method?: string
  url?: string
}

interface ApiResponse {
  setHeader(name: string, value: string): void
  status(code: number): ApiResponse
  json(body: unknown): void
  send(body: string): void
}

const FEED_GROUPS = {
  active: 'active',
  visual: 'visual',
  cosmos2251: 'cosmos-2251-debris',
  iridium33: 'iridium-33-debris',
  fengyun1c: 'fengyun-1c-debris',
} as const

type FeedKey = keyof typeof FEED_GROUPS

function isFeedKey(value: string | null): value is FeedKey {
  return value !== null && Object.hasOwn(FEED_GROUPS, value)
}

function fail(response: ApiResponse, status: number, error: string) {
  response.status(status).json({ error })
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    fail(response, 405, `Method ${request.method ?? 'unknown'} is not allowed`)
    return
  }

  const url = new URL(request.url ?? '/api/tle', 'https://astrobender.invalid')
  const feed = url.searchParams.get('feed')
  if (url.searchParams.size !== 1 || !isFeedKey(feed)) {
    fail(response, 400, 'tle requires exactly one allowed feed parameter')
    return
  }

  const upstreamUrl = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${FEED_GROUPS[feed]}&FORMAT=tle`
  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, {
      headers: { Accept: 'text/plain', 'User-Agent': 'ASTROBENDER/1.0' },
      signal: AbortSignal.timeout(10_000),
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    fail(response, 504, `CelesTrak ${feed} request failed after 10000 ms: ${detail}`)
    return
  }

  if (!upstream.ok) {
    const body = (await upstream.text()).replace(/\s+/g, ' ').slice(0, 180)
    fail(
      response,
      502,
      `CelesTrak ${feed} returned HTTP ${upstream.status} ${upstream.statusText}${body ? ` — ${body}` : ''}`,
    )
    return
  }

  const text = await upstream.text()
  if (!(text.startsWith('1 ') || text.includes('\n1 ')) || !text.includes('\n2 ')) {
    fail(response, 502, `CelesTrak ${feed} returned an invalid TLE payload`)
    return
  }

  response.setHeader('Content-Type', 'text/plain; charset=utf-8')
  response.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600')
  response.status(200).send(text)
}
