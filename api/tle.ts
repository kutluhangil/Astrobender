import { getCelestrakFeedMetadata, parseCelestrakOmmCsv } from '../app/src/lib/celestrak-omm.ts'

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
type ResponseFormat = 'tle' | 'csv'

function isFeedKey(value: string | null): value is FeedKey {
  return value !== null && Object.hasOwn(FEED_GROUPS, value)
}

function isResponseFormat(value: string | null): value is ResponseFormat {
  return value === null || value === 'tle' || value === 'csv'
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
  const format = url.searchParams.get('format')
  const onlyAllowedParameters = [...url.searchParams.keys()].every((key) => key === 'feed' || key === 'format')
  if (
    url.searchParams.size < 1
    || url.searchParams.size > 2
    || url.searchParams.getAll('feed').length !== 1
    || url.searchParams.getAll('format').length > 1
    || !onlyAllowedParameters
    || !isFeedKey(feed)
    || !isResponseFormat(format)
  ) {
    fail(response, 400, 'tle requires one allowed feed parameter and optional format=csv')
    return
  }

  const responseFormat: ResponseFormat = format ?? 'tle'
  const upstreamUrl = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${FEED_GROUPS[feed]}&FORMAT=${responseFormat.toUpperCase()}`
  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, {
      headers: { Accept: responseFormat === 'csv' ? 'text/csv' : 'text/plain', 'User-Agent': 'ASTROBENDER/1.0' },
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
  try {
    if (responseFormat === 'csv') {
      parseCelestrakOmmCsv(text, getCelestrakFeedMetadata(feed))
    } else if (!(text.startsWith('1 ') || text.includes('\n1 ')) || !text.includes('\n2 ')) {
      throw new Error('missing TLE line 1 or line 2')
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    fail(response, 502, `CelesTrak ${feed} returned an invalid ${responseFormat === 'csv' ? 'OMM CSV' : 'TLE'} payload: ${detail}`)
    return
  }

  response.setHeader('Content-Type', responseFormat === 'csv' ? 'text/csv; charset=utf-8' : 'text/plain; charset=utf-8')
  response.setHeader('Cache-Control', 'public, s-maxage=7200, stale-while-revalidate=3600')
  response.status(200).send(text)
}
