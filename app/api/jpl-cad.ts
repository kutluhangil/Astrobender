interface ApiRequest {
  method?: string
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

  const upstream = await fetch(JPL_CAD_URL, {
    headers: { Accept: 'application/json', 'User-Agent': 'ASTROBENDER/1.0' },
  })
  if (!upstream.ok) {
    const body = (await upstream.text()).replace(/\s+/g, ' ').slice(0, 180)
    response.status(502).json({
      error: `JPL CAD returned HTTP ${upstream.status} ${upstream.statusText}${body ? ` — ${body}` : ''}`,
    })
    return
  }

  const payload: unknown = await upstream.json()
  response.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600')
  response.status(200).json(payload)
}
