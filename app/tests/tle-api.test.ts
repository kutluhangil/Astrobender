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
    assert.equal(response.headers.get('Cache-Control'), 'public, s-maxage=7200, stale-while-revalidate=3600')
    assert.equal(response.body, 'ISS\n1 25544\n2 25544')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('TLE proxy rejects unknown and extra feed parameters before contacting CelesTrak', async () => {
  const response = createResponse()
  await handler({ method: 'GET', url: '/api/tle?feed=unknown&extra=1' }, response)

  assert.equal(response.statusCode, 400)
  assert.deepEqual(response.body, { error: 'tle requires one allowed feed parameter and optional format=csv' })
})

test('TLE proxy rejects duplicated feed or format parameters before contacting CelesTrak', async () => {
  const originalFetch = globalThis.fetch
  let fetched = false
  globalThis.fetch = async () => {
    fetched = true
    return new Response('', { status: 500 })
  }
  try {
    const duplicateFeed = createResponse()
    await handler({ method: 'GET', url: '/api/tle?feed=active&feed=visual' }, duplicateFeed)
    assert.equal(duplicateFeed.statusCode, 400)

    const duplicateFormat = createResponse()
    await handler({ method: 'GET', url: '/api/tle?feed=active&format=csv&format=csv' }, duplicateFormat)
    assert.equal(duplicateFormat.statusCode, 400)
    assert.equal(fetched, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('TLE proxy exposes validated OMM CSV only through the opt-in format without changing the legacy endpoint', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl = ''
  globalThis.fetch = async (input) => {
    requestedUrl = String(input)
    return new Response([
      'OBJECT_NAME,OBJECT_ID,EPOCH,MEAN_MOTION,ECCENTRICITY,INCLINATION,RA_OF_ASC_NODE,ARG_OF_PERICENTER,MEAN_ANOMALY,EPHEMERIS_TYPE,CLASSIFICATION_TYPE,NORAD_CAT_ID,BSTAR,MEAN_MOTION_DOT,MEAN_MOTION_DDOT',
      'ISS (ZARYA),1998-067A,2026-08-13T05:00:00.000000,15.5,0.0001234,51.64,12.3456,45.6789,90.1234,0,U,25544,0.00012345,0.00000123,0',
    ].join('\n'), { status: 200 })
  }
  try {
    const response = createResponse()
    await handler({ method: 'GET', url: '/api/tle?feed=active&format=csv' }, response)

    assert.match(requestedUrl, /GROUP=active/)
    assert.match(requestedUrl, /FORMAT=CSV/)
    assert.equal(response.statusCode, 200)
    assert.equal(response.headers.get('Content-Type'), 'text/csv; charset=utf-8')
    assert.match(String(response.body), /NORAD_CAT_ID/)
  } finally {
    globalThis.fetch = originalFetch
  }
})
