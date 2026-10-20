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

// The TLE format stores catalog numbers in five characters and the catalog
// passed 99999 on 2026-07-11, so CelesTrak's TLE output drops every newer
// object. OMM CSV carries the full number. This list must stay identical to
// OMM_CSV_COLUMNS in app/src/lib/omm.ts; tests/tle-api.test.ts checks it.
// The proxy stays free of app imports so Vercel bundles it as a single file.
export const OUTPUT_COLUMNS = [
  'OBJECT_NAME',
  'OBJECT_ID',
  'NORAD_CAT_ID',
  'EPOCH',
  'MEAN_MOTION',
  'ECCENTRICITY',
  'INCLINATION',
  'RA_OF_ASC_NODE',
  'ARG_OF_PERICENTER',
  'MEAN_ANOMALY',
  'BSTAR',
  'MEAN_MOTION_DOT',
  'MEAN_MOTION_DDOT',
] as const

const REQUIRED_COLUMNS = OUTPUT_COLUMNS.filter((column) => column !== 'OBJECT_ID')

// Vercel rejects function responses above 4.5 MB; fail loudly before that.
const MAX_RESPONSE_BYTES = 4_400_000

function isFeedKey(value: string | null): value is FeedKey {
  return value !== null && Object.hasOwn(FEED_GROUPS, value)
}

function fail(response: ApiResponse, status: number, error: string) {
  response.status(status).json({ error })
}

function excerpt(text: string): string {
  return text.replace(/\s+/g, ' ').slice(0, 180)
}

/** RFC 4180 rows: quoted fields may hold commas, doubled quotes and line breaks. */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let fieldStarted = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index++
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"' && !fieldStarted) {
      quoted = true
      fieldStarted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
      fieldStarted = false
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++
      row.push(field)
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
      field = ''
      fieldStarted = false
    } else {
      field += char
      fieldStarted = true
    }
  }
  if (quoted) throw new Error('CSV ends inside a quoted field')
  if (fieldStarted || row.length > 0) {
    row.push(field)
    if (row.length > 1 || row[0] !== '') rows.push(row)
  }
  return rows
}

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/**
 * Re-emits CelesTrak's CSV with only the columns SGP4 needs, values copied as
 * published. Rows missing a required value are dropped and counted.
 */
export function compactGpCsv(text: string): { csv: string; rows: number; dropped: number } {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''))
  if (rows.length === 0) throw new Error('CelesTrak returned an empty CSV')
  const header = rows[0].map((column) => column.trim().toUpperCase())
  const missing = REQUIRED_COLUMNS.filter((column) => !header.includes(column))
  if (missing.length > 0) {
    throw new Error(`CelesTrak CSV header is missing ${missing.join(', ')} — ${excerpt(text)}`)
  }
  const indexes = OUTPUT_COLUMNS.map((column) => header.indexOf(column))
  const lines = [OUTPUT_COLUMNS.join(',')]
  let dropped = 0
  for (const row of rows.slice(1)) {
    const values = indexes.map((index) => (index < 0 ? '' : (row[index] ?? '').trim()))
    const complete = OUTPUT_COLUMNS.every(
      (column, position) => column === 'OBJECT_ID' || values[position] !== '',
    )
    if (!complete) {
      dropped++
      continue
    }
    lines.push(values.map(csvField).join(','))
  }
  return { csv: `${lines.join('\n')}\n`, rows: lines.length - 1, dropped }
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

  const upstreamUrl = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${FEED_GROUPS[feed]}&FORMAT=csv`
  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, {
      headers: { Accept: 'text/csv', 'User-Agent': 'ASTROBENDER/1.0' },
      signal: AbortSignal.timeout(10_000),
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    fail(response, 504, `CelesTrak ${feed} request failed after 10000 ms: ${detail}`)
    return
  }

  if (!upstream.ok) {
    const body = excerpt(await upstream.text())
    fail(
      response,
      502,
      `CelesTrak ${feed} returned HTTP ${upstream.status} ${upstream.statusText}${body ? ` — ${body}` : ''}`,
    )
    return
  }

  const text = await upstream.text()
  let compact: ReturnType<typeof compactGpCsv>
  try {
    compact = compactGpCsv(text)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    fail(response, 502, `CelesTrak ${feed} returned an invalid OMM CSV payload: ${detail}`)
    return
  }
  if (compact.rows === 0) {
    fail(response, 502, `CelesTrak ${feed} returned no usable element sets — ${excerpt(text)}`)
    return
  }
  const bytes = new TextEncoder().encode(compact.csv).byteLength
  if (bytes > MAX_RESPONSE_BYTES) {
    fail(
      response,
      502,
      `CelesTrak ${feed} compacted to ${bytes} bytes, above the ${MAX_RESPONSE_BYTES}-byte function response cap`,
    )
    return
  }

  response.setHeader('Content-Type', 'text/csv; charset=utf-8')
  response.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600')
  response.setHeader('X-Astrobender-Dropped-Rows', String(compact.dropped))
  response.status(200).send(compact.csv)
}
