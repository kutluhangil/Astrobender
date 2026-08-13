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

interface JplCadHandlerOptions {
  fetchImpl?: FetchImplementation
}

const JPL_CAD_URL =
  'https://ssd-api.jpl.nasa.gov/cad.api?date-min=now&date-max=%2B60&dist-max=0.2&diameter=true&fullname=true&sort=date'
const JPL_REQUIRED_FIELDS = ['des', 'cd', 'dist', 'v_rel'] as const

function failure(response: ApiResponse, status: number, error: string, detail: string) {
  response.status(status).json({ error, detail })
}

function cadPayloadError(payload: unknown): string | null {
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

export function createJplCadHandler({ fetchImpl = fetch }: JplCadHandlerOptions = {}) {
  return async function handler(request: ApiRequest, response: ApiResponse) {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET')
      response.status(405).json({ error: `Method ${request.method ?? 'unknown'} is not allowed` })
      return
    }

    if ((request.url ?? '').includes('?')) {
      failure(response, 400, 'JPL_QUERY_REJECTED', 'jpl-cad accepts no query parameters')
      return
    }

    let upstream: Response
    try {
      upstream = await fetchImpl(JPL_CAD_URL, {
        headers: { Accept: 'application/json', 'User-Agent': 'ASTROBENDER/1.0' },
        signal: AbortSignal.timeout(10_000),
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      failure(response, 504, 'JPL_NETWORK_ERROR', detail)
      return
    }

    if (!upstream.ok) {
      let body: string
      try {
        body = (await upstream.text()).replace(/\s+/g, ' ').slice(0, 180)
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        failure(
          response,
          502,
          'JPL_UPSTREAM_ERROR',
          `JPL CAD returned HTTP ${upstream.status} ${upstream.statusText}; error body could not be read: ${detail}`,
        )
        return
      }
      failure(
        response,
        502,
        'JPL_UPSTREAM_ERROR',
        `JPL CAD returned HTTP ${upstream.status} ${upstream.statusText}${body ? ` — ${body}` : ''}`,
      )
      return
    }

    let payload: unknown
    try {
      payload = await upstream.json()
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      if (error instanceof SyntaxError) {
        failure(response, 502, 'JPL_INVALID_PAYLOAD', `JPL CAD returned invalid JSON: ${detail}`)
      } else {
        failure(response, 504, 'JPL_NETWORK_ERROR', `JPL CAD response body could not be read: ${detail}`)
      }
      return
    }
    const invalidPayload = cadPayloadError(payload)
    if (invalidPayload) {
      failure(response, 502, 'JPL_INVALID_PAYLOAD', invalidPayload)
      return
    }

    response.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600')
    response.status(200).json(payload)
  }
}

export default createJplCadHandler()
