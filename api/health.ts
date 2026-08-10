interface ApiRequest {
  method?: string
}

interface ApiResponse {
  setHeader(name: string, value: string): void
  status(code: number): ApiResponse
  json(body: unknown): void
}

export default function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.status(405).json({ error: `Method ${request.method ?? 'unknown'} is not allowed` })
    return
  }

  response.setHeader('Cache-Control', 'no-store')
  response.status(200).json({
    status: 'ok',
    service: 'astrobender',
    generatedAt: new Date().toISOString(),
    revision: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    dependencies: {
      tleProxy: 'configured',
      jplCadProxy: 'configured',
    },
  })
}
