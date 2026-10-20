interface ApiRequest {
  method?: string
  url?: string
}

interface ApiResponse {
  setHeader(name: string, value: string): void
  status(code: number): ApiResponse
  json(body: unknown): void
}

interface FeedDefinition {
  label: string
  /** Seconds the CDN may serve the payload; chosen per feed from how often upstream changes. */
  maxAgeSeconds: number
  /** Upstream wait before giving up; APOD is routinely slow. */
  timeoutMs?: number
  url: (now: Date) => string
}

const DONKI_BASE = 'https://ccmc.gsfc.nasa.gov/DONKI/WS/get'
const JPL_API = 'https://ssd-api.jpl.nasa.gov'
const HORIZONS_API = 'https://ssd.jpl.nasa.gov/api/horizons.api'
const TAP_SYNC = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync'

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function donkiWindow(now: Date, days: number): string {
  const start = new Date(now.getTime() - days * 86_400_000)
  return `startDate=${isoDay(start)}&endDate=${isoDay(now)}`
}

function horizonsRange(spacecraftId: string, now: Date): string {
  const next = new Date(now.getTime() + 86_400_000)
  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${spacecraftId}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'500@399'",
    START_TIME: `'${isoDay(now)}'`,
    STOP_TIME: `'${isoDay(next)}'`,
    STEP_SIZE: "'1d'",
    QUANTITIES: "'19,20'",
  })
  return `${HORIZONS_API}?${params}`
}

function tap(query: string): string {
  return `${TAP_SYNC}?${new URLSearchParams({ query, format: 'json' })}`
}

/**
 * Every upstream URL is built here from a fixed allowlist. The client only
 * names a feed, so this function cannot be steered into an open proxy and the
 * CDN holds one cacheable URL per feed.
 */
const FEEDS: Record<string, FeedDefinition> = {
  'donki-flares': {
    label: 'NASA DONKI solar flares',
    maxAgeSeconds: 900,
    url: (now) => `${DONKI_BASE}/FLR?${donkiWindow(now, 30)}`,
  },
  'donki-cme': {
    label: 'NASA DONKI coronal mass ejections',
    maxAgeSeconds: 900,
    url: (now) => `${DONKI_BASE}/CME?${donkiWindow(now, 30)}`,
  },
  'donki-storms': {
    label: 'NASA DONKI geomagnetic storms',
    maxAgeSeconds: 900,
    url: (now) => `${DONKI_BASE}/GST?${donkiWindow(now, 60)}`,
  },
  sentry: {
    label: 'JPL Sentry impact risk',
    maxAgeSeconds: 3600,
    url: () => `${JPL_API}/sentry.api`,
  },
  scout: {
    label: 'JPL Scout',
    maxAgeSeconds: 600,
    url: () => `${JPL_API}/scout.api`,
  },
  fireball: {
    label: 'JPL CNEOS fireballs',
    maxAgeSeconds: 3600,
    url: () => `${JPL_API}/fireball.api?limit=25`,
  },
  apod: {
    label: 'NASA APOD',
    maxAgeSeconds: 3600,
    timeoutMs: 25_000,
    url: () => `https://api.nasa.gov/planetary/apod?api_key=${process.env.NASA_API_KEY || 'DEMO_KEY'}`,
  },
  epic: {
    label: 'NASA EPIC natural color',
    maxAgeSeconds: 1800,
    url: () => 'https://epic.gsfc.nasa.gov/api/natural',
  },
  'voyager-1': {
    label: 'JPL Horizons Voyager 1',
    maxAgeSeconds: 3600,
    url: (now) => horizonsRange('-31', now),
  },
  'voyager-2': {
    label: 'JPL Horizons Voyager 2',
    maxAgeSeconds: 3600,
    url: (now) => horizonsRange('-32', now),
  },
  'exoplanets-recent': {
    label: 'NASA Exoplanet Archive recent discoveries',
    maxAgeSeconds: 21_600,
    url: () =>
      tap(
        'select top 8 pl_name,hostname,disc_year,discoverymethod,pl_rade,pl_orbper,sy_dist,disc_facility ' +
          'from pscomppars order by disc_year desc, rowupdate desc',
      ),
  },
  'exoplanets-count': {
    label: 'NASA Exoplanet Archive confirmed count',
    maxAgeSeconds: 21_600,
    url: () => tap('select count(*) as confirmed from pscomppars'),
  },
}

export const NASA_FEED_IDS = Object.keys(FEEDS)

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.status(405).json({ error: `Method ${request.method ?? 'unknown'} is not allowed` })
    return
  }

  const query = new URL(request.url ?? '', 'http://localhost').searchParams
  const extra = [...query.keys()].filter((key) => key !== 'feed')
  if (extra.length > 0) {
    response.status(400).json({ error: `nasa-feed accepts only a feed parameter, got: ${extra.join(', ')}` })
    return
  }
  const feedId = query.get('feed') ?? ''
  const feed = Object.hasOwn(FEEDS, feedId) ? FEEDS[feedId] : undefined
  if (!feed) {
    response.status(400).json({ error: `Unknown feed "${feedId}". Known feeds: ${NASA_FEED_IDS.join(', ')}` })
    return
  }

  let upstream: Response
  try {
    upstream = await fetch(feed.url(new Date()), {
      headers: { Accept: 'application/json', 'User-Agent': 'ASTROBENDER/1.0' },
      signal: AbortSignal.timeout(feed.timeoutMs ?? 12_000),
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    response.status(504).json({ error: `${feed.label} request failed after ${feed.timeoutMs ?? 12_000} ms: ${detail}` })
    return
  }
  const text = await upstream.text()
  const excerpt = text.replace(/\s+/g, ' ').slice(0, 180)
  if (!upstream.ok) {
    response.status(502).json({
      error: `${feed.label} returned HTTP ${upstream.status} ${upstream.statusText}${excerpt ? ` — ${excerpt}` : ''}`,
    })
    return
  }
  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    response.status(502).json({ error: `${feed.label} returned invalid JSON (${detail}) — ${excerpt}` })
    return
  }
  response.setHeader(
    'Cache-Control',
    `public, s-maxage=${feed.maxAgeSeconds}, stale-while-revalidate=${feed.maxAgeSeconds * 4}`,
  )
  response.status(200).json(payload)
}
