interface ApiRequest {
  method?: string
  url?: string
}

interface ApiResponse {
  setHeader(name: string, value: string): void
  status(code: number): ApiResponse
  json(body: unknown): void
}

type FetchImplementation = (input: string, init?: RequestInit) => Promise<Response>
type DependencyStatus = 'ok' | 'unavailable'

interface DependencyError {
  code: string
  detail: string
}

interface DependencyProbe {
  status: DependencyStatus
  checkedAt: string
  durationMs: number
  httpStatus: number | null
  error: DependencyError | null
}

type DependencyReport = Record<'tleProxy' | 'jplCadProxy', DependencyProbe>

interface HealthHandlerOptions {
  fetchImpl?: FetchImplementation
  now?: () => number
}

const JPL_CAD_URL =
  'https://ssd-api.jpl.nasa.gov/cad.api?date-min=now&date-max=%2B60&dist-max=0.2&diameter=true&fullname=true&sort=date'
const TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle'
const JPL_REQUIRED_FIELDS = ['des', 'cd', 'dist', 'v_rel'] as const

function safeDetail(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error)
  return detail.replace(/\s+/g, ' ').slice(0, 180) || 'unknown error'
}

function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')
}

function finishProbe(
  startedAt: number,
  now: () => number,
  httpStatus: number | null,
  error: DependencyError | null,
): DependencyProbe {
  return {
    status: error ? 'unavailable' : 'ok',
    checkedAt: new Date(startedAt).toISOString(),
    durationMs: Math.max(0, now() - startedAt),
    httpStatus,
    error,
  }
}

function jplPayloadError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'JPL CAD response must be an object'
  }
  const record = payload as Record<string, unknown>
  if (!Array.isArray(record.fields) || !Array.isArray(record.data)) {
    return 'JPL CAD response must contain fields and data arrays'
  }
  const fields = record.fields.map(String)
  const missing = JPL_REQUIRED_FIELDS.filter((field) => !fields.includes(field))
  return missing.length > 0
    ? `JPL CAD response is missing required fields: ${missing.join(', ')}`
    : null
}

async function probeTle(fetchImpl: FetchImplementation, now: () => number): Promise<DependencyProbe> {
  const startedAt = now()
  let response: Response
  try {
    response = await fetchImpl(TLE_URL, {
      headers: { Accept: 'text/plain' },
      signal: AbortSignal.timeout(7_000),
    })
  } catch (error) {
    const timeout = isTimeout(error)
    return finishProbe(startedAt, now, null, {
      code: timeout ? 'TLE_TIMEOUT' : 'TLE_NETWORK_ERROR',
      detail: `CelesTrak request ${timeout ? 'timed out' : 'failed'}: ${safeDetail(error)}`,
    })
  }

  if (!response.ok) {
    return finishProbe(startedAt, now, response.status, {
      code: 'TLE_UPSTREAM_ERROR',
      detail: `CelesTrak returned HTTP ${response.status} ${response.statusText}`.trim(),
    })
  }

  let text: string
  try {
    text = await response.text()
  } catch (error) {
    return finishProbe(startedAt, now, response.status, {
      code: 'TLE_NETWORK_ERROR',
      detail: `CelesTrak response body could not be read: ${safeDetail(error)}`,
    })
  }
  if (!/(^|\n)1 \d{5}/.test(text) || !/(^|\n)2 \d{5}/.test(text)) {
    return finishProbe(startedAt, now, response.status, {
      code: 'TLE_INVALID_PAYLOAD',
      detail: 'CelesTrak returned an invalid TLE payload',
    })
  }
  return finishProbe(startedAt, now, response.status, null)
}

async function probeJpl(fetchImpl: FetchImplementation, now: () => number): Promise<DependencyProbe> {
  const startedAt = now()
  let response: Response
  try {
    response = await fetchImpl(JPL_CAD_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(7_000),
    })
  } catch (error) {
    const timeout = isTimeout(error)
    return finishProbe(startedAt, now, null, {
      code: timeout ? 'JPL_TIMEOUT' : 'JPL_NETWORK_ERROR',
      detail: `JPL CAD request ${timeout ? 'timed out' : 'failed'}: ${safeDetail(error)}`,
    })
  }

  if (!response.ok) {
    return finishProbe(startedAt, now, response.status, {
      code: 'JPL_UPSTREAM_ERROR',
      detail: `JPL CAD returned HTTP ${response.status} ${response.statusText}`.trim(),
    })
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    const parseError = error instanceof SyntaxError
    return finishProbe(startedAt, now, response.status, {
      code: parseError ? 'JPL_INVALID_PAYLOAD' : 'JPL_NETWORK_ERROR',
      detail: parseError
        ? `JPL CAD returned invalid JSON: ${safeDetail(error)}`
        : `JPL CAD response body could not be read: ${safeDetail(error)}`,
    })
  }
  const invalidPayload = jplPayloadError(payload)
  if (invalidPayload) {
    return finishProbe(startedAt, now, response.status, {
      code: 'JPL_INVALID_PAYLOAD',
      detail: invalidPayload,
    })
  }
  return finishProbe(startedAt, now, response.status, null)
}

async function probeDependencies(
  fetchImpl: FetchImplementation,
  now: () => number,
): Promise<DependencyReport> {
  const [tleProxy, jplCadProxy] = await Promise.all([
    probeTle(fetchImpl, now),
    probeJpl(fetchImpl, now),
  ])
  return { tleProxy, jplCadProxy }
}

export function createHealthHandler({ fetchImpl = fetch, now = Date.now }: HealthHandlerOptions = {}) {
  return async function handler(request: ApiRequest, response: ApiResponse) {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET')
      response.status(405).json({ error: `Method ${request.method ?? 'unknown'} is not allowed` })
      return
    }

    response.setHeader('Cache-Control', 'no-store')
    const mode = new URL(request.url ?? '/api/health', 'https://astrobender.invalid').searchParams.get('mode')
    if (mode === 'ready') {
      const dependencies = await probeDependencies(fetchImpl, now)
      const ready = Object.values(dependencies).every(({ status }) => status === 'ok')
      response.status(ready ? 200 : 503).json({
        status: ready ? 'ready' : 'not_ready',
        service: 'astrobender',
        generatedAt: new Date().toISOString(),
        revision: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
        dependencies,
      })
      return
    }
    if (mode !== null) {
      response.status(400).json({ error: `Unsupported health mode: ${mode}` })
      return
    }

    response.status(200).json({
      status: 'ok',
      service: 'astrobender',
      generatedAt: new Date().toISOString(),
      revision: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    })
  }
}

export default createHealthHandler()
