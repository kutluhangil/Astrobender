import assert from 'node:assert/strict'
import test from 'node:test'
import handler from '../../api/tle.ts'

interface CapturedResponse {
  headers: Map<string, string>
  statusCode: number
  body: unknown
}

function createResponse(): CapturedResponse & {
  setHeader(name: string, value: string): void
  status(code: number): ReturnType<typeof createResponse>
  json(body: unknown): void
  send(body: string): void
} {
  const captured: CapturedResponse = {
    headers: new Map(),
    statusCode: 200,
    body: null,
  }
  return Object.assign(captured, {
    setHeader(name: string, value: string) {
      captured.headers.set(name, value)
    },
    status(code: number) {
      captured.statusCode = code
      return this
    },
    json(body: unknown) {
      captured.body = body
    },
    send(body: string) {
      captured.body = body
    },
  })
}

test('TLE proxy accepts only allow-listed feeds and caches valid CelesTrak output', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl = ''
  globalThis.fetch = async (input) => {
    requestedUrl = String(input)
    return new Response('ISS\n1 25544\n2 25544', { status: 200 })
  }
  try {
    const response = createResponse()
    await handler({ method: 'GET', url: '/api/tle?feed=active' }, response)

    assert.match(requestedUrl, /GROUP=active/)
    assert.equal(response.statusCode, 200)
    assert.equal(response.headers.get('Cache-Control'), 'public, s-maxage=900, stale-while-revalidate=3600')
    assert.equal(response.body, 'ISS\n1 25544\n2 25544')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('TLE proxy rejects unknown and extra feed parameters before contacting CelesTrak', async () => {
  const response = createResponse()
  await handler({ method: 'GET', url: '/api/tle?feed=unknown&extra=1' }, response)

  assert.equal(response.statusCode, 400)
  assert.deepEqual(response.body, { error: 'tle requires exactly one allowed feed parameter' })
})
