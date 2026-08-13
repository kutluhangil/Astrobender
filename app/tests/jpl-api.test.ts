import assert from 'node:assert/strict'
import test from 'node:test'
import { createJplCadHandler } from '../../api/jpl-cad.ts'
import { assertJplCadPayload, assertServiceWorkerSource } from '../scripts/production-smoke.mjs'

interface CapturedResponse {
  headers: Map<string, string>
  statusCode: number
  body: unknown
}

function createResponse(): CapturedResponse & {
  setHeader(name: string, value: string): void
  status(code: number): ReturnType<typeof createResponse>
  json(body: unknown): void
} {
  const captured: CapturedResponse = { headers: new Map(), statusCode: 200, body: null }
  return Object.assign(captured, {
    setHeader(name: string, value: string) { captured.headers.set(name, value) },
    status(code: number) { captured.statusCode = code; return this },
    json(body: unknown) { captured.body = body },
  })
}

const validPayload = { fields: ['des', 'cd', 'dist', 'v_rel'], data: [['1', '2026-08-13', '0.1', '12']] }

test('JPL CAD handler returns validated fixed-query upstream data', async () => {
  let requestedUrl = ''
  const handler = createJplCadHandler({
    fetchImpl: async (input) => {
      requestedUrl = String(input)
      return Response.json(validPayload)
    },
  })
  const response = createResponse()

  await handler({ method: 'GET', url: '/api/jpl-cad' }, response)

  assert.match(requestedUrl, /date-min=now/)
  assert.equal(response.statusCode, 200)
  assert.equal(response.headers.get('Cache-Control'), 'public, s-maxage=900, stale-while-revalidate=3600')
  assert.deepEqual(response.body, validPayload)
})

test('JPL CAD handler rejects query parameters before contacting JPL', async () => {
  const handler = createJplCadHandler({ fetchImpl: async () => { throw new Error('must not fetch') } })
  const response = createResponse()

  await handler({ method: 'GET', url: '/api/jpl-cad?date-min=2026-01-01' }, response)

  assert.equal(response.statusCode, 400)
  assert.deepEqual(response.body, { error: 'JPL_QUERY_REJECTED', detail: 'jpl-cad accepts no query parameters' })
})

test('JPL CAD handler reports network and timeout errors without throwing', async () => {
  const handler = createJplCadHandler({ fetchImpl: async () => { throw new DOMException('request timed out', 'AbortError') } })
  const response = createResponse()

  await handler({ method: 'GET', url: '/api/jpl-cad' }, response)

  assert.equal(response.statusCode, 504)
  assert.deepEqual(response.body, { error: 'JPL_NETWORK_ERROR', detail: 'request timed out' })
})

test('JPL CAD handler reports non-success upstream responses', async () => {
  const handler = createJplCadHandler({ fetchImpl: async () => new Response('maintenance', { status: 503, statusText: 'Service Unavailable' }) })
  const response = createResponse()

  await handler({ method: 'GET', url: '/api/jpl-cad' }, response)

  assert.equal(response.statusCode, 502)
  assert.deepEqual(response.body, {
    error: 'JPL_UPSTREAM_ERROR',
    detail: 'JPL CAD returned HTTP 503 Service Unavailable — maintenance',
  })
})

test('JPL CAD handler rejects invalid JSON payloads', async () => {
  const handler = createJplCadHandler({ fetchImpl: async () => new Response('{', { status: 200, headers: { 'Content-Type': 'application/json' } }) })
  const response = createResponse()

  await handler({ method: 'GET', url: '/api/jpl-cad' }, response)

  assert.equal(response.statusCode, 502)
  assert.equal((response.body as { error: string }).error, 'JPL_INVALID_PAYLOAD')
  assert.match((response.body as { detail: string }).detail, /invalid JSON/)
})

test('JPL CAD handler rejects payloads missing required fields', async () => {
  const handler = createJplCadHandler({
    fetchImpl: async () => Response.json({ fields: ['des', 'cd', 'dist'], data: [] }),
  })
  const response = createResponse()

  await handler({ method: 'GET', url: '/api/jpl-cad' }, response)

  assert.equal(response.statusCode, 502)
  assert.deepEqual(response.body, {
    error: 'JPL_INVALID_PAYLOAD',
    detail: 'JPL CAD response is missing required fields: v_rel',
  })
})

test('JPL CAD handler reports unreadable upstream error bodies without throwing', async () => {
  const unreadable = {
    ok: false,
    status: 503,
    statusText: 'Service Unavailable',
    text: async () => { throw new Error('response stream failed') },
  } as Response
  const handler = createJplCadHandler({ fetchImpl: async () => unreadable })
  const response = createResponse()

  await handler({ method: 'GET', url: '/api/jpl-cad' }, response)

  assert.equal(response.statusCode, 502)
  assert.deepEqual(response.body, {
    error: 'JPL_UPSTREAM_ERROR',
    detail: 'JPL CAD returned HTTP 503 Service Unavailable; error body could not be read: response stream failed',
  })
})

test('JPL CAD handler reports SyntaxError from a complete invalid JSON body as invalid payload', async () => {
  const unreadable = {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => { throw new SyntaxError('Unexpected end of JSON input') },
  } as Response
  const handler = createJplCadHandler({ fetchImpl: async () => unreadable })
  const response = createResponse()

  await handler({ method: 'GET', url: '/api/jpl-cad' }, response)

  assert.equal(response.statusCode, 502)
  assert.deepEqual(response.body, {
    error: 'JPL_INVALID_PAYLOAD',
    detail: 'JPL CAD returned invalid JSON: Unexpected end of JSON input',
  })
})

test('JPL CAD handler reports TypeError while reading a 200 body as a network error', async () => {
  const unreadable = {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => { throw new TypeError('terminated') },
  } as Response
  const handler = createJplCadHandler({ fetchImpl: async () => unreadable })
  const response = createResponse()

  await handler({ method: 'GET', url: '/api/jpl-cad' }, response)

  assert.equal(response.statusCode, 504)
  assert.deepEqual(response.body, {
    error: 'JPL_NETWORK_ERROR',
    detail: 'JPL CAD response body could not be read: terminated',
  })
})

test('JPL CAD handler reports AbortError and TimeoutError while reading a 200 body as network errors', async () => {
  for (const error of [
    new DOMException('The operation was aborted', 'AbortError'),
    new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
  ]) {
    const unreadable = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => { throw error },
    } as Response
    const handler = createJplCadHandler({ fetchImpl: async () => unreadable })
    const response = createResponse()

    await handler({ method: 'GET', url: '/api/jpl-cad' }, response)

    assert.equal(response.statusCode, 504, error.name)
    assert.deepEqual(response.body, {
      error: 'JPL_NETWORK_ERROR',
      detail: `JPL CAD response body could not be read: ${error.message}`,
    })
  }
})

test('production smoke requires every JPL CAD field consumed by the client', () => {
  assert.throws(
    () => assertJplCadPayload({ fields: ['des', 'cd', 'dist'], data: [] }),
    /missing required fields: v_rel/,
  )
  assert.doesNotThrow(() => assertJplCadPayload(validPayload))
})

test('production smoke recognizes the custom injected-manifest service worker contract', () => {
  assert.doesNotThrow(() => assertServiceWorkerSource(
    'const h="astrobender-shell-v1",g=[{"revision":"0123456789abcdef","url":"index.html"}];self.addEventListener("install",e=>{});',
  ))
  assert.throws(
    () => assertServiceWorkerSource('self.addEventListener("fetch", () => {})'),
    /custom app-shell precache contract/,
  )
})
