import test from 'node:test'
import assert from 'node:assert/strict'
import { createHealthHandler } from '../../api/health.ts'
import { assertReadinessPayload } from '../scripts/production-smoke.mjs'

const checkedAt = Date.UTC(2026, 7, 13, 12, 0, 0)
const validTle = 'ISS (ZARYA)\n1 25544U 98067A\n2 25544  51.6400'
const validJpl = {
  fields: ['des', 'cd', 'dist', 'v_rel'],
  data: [['2026 AB', '2026-Aug-13', '0.1', '12.5']],
}

function dependencyFetch(overrides: {
  tle?: () => Promise<Response>
  jpl?: () => Promise<Response>
} = {}) {
  return async (input: string | URL | Request) => {
    const url = String(input)
    if (url.includes('celestrak.org')) {
      return overrides.tle?.() ?? new Response(validTle, { status: 200 })
    }
    return overrides.jpl?.() ?? Response.json(validJpl)
  }
}

function createResponse() {
  const headers = new Map<string, string>()
  let statusCode = 0
  let body: unknown
  return {
    response: {
      setHeader(name: string, value: string) {
        headers.set(name, value)
      },
      status(code: number) {
        statusCode = code
        return this
      },
      json(value: unknown) {
        body = value
      },
    },
    result: () => ({ headers, statusCode, body }),
  }
}

test('liveness endpoint is non-cacheable and does not claim dependency health', async () => {
  let fetchCount = 0
  const health = createHealthHandler({
    fetchImpl: async () => {
      fetchCount += 1
      throw new Error('liveness must not probe dependencies')
    },
  })
  const recorder = createResponse()
  await health({ method: 'GET', url: '/api/health' }, recorder.response)
  const result = recorder.result()

  assert.equal(result.statusCode, 200)
  assert.equal(result.headers.get('Cache-Control'), 'no-store')
  assert.equal((result.body as { status: string }).status, 'ok')
  assert.equal('dependencies' in (result.body as object), false)
  assert.equal(fetchCount, 0)
})

test('readiness rejects a 2xx response with invalid TLE structure and exposes diagnostics', async () => {
  const health = createHealthHandler({
    fetchImpl: dependencyFetch({ tle: async () => new Response('temporarily empty', { status: 200 }) }),
    now: () => checkedAt,
  })
  const recorder = createResponse()
  await health({ method: 'GET', url: '/api/health?mode=ready' }, recorder.response)
  const result = recorder.result()

  assert.equal(result.statusCode, 503)
  assert.deepEqual((result.body as { dependencies: unknown }).dependencies, {
    tleProxy: {
      status: 'unavailable',
      checkedAt: '2026-08-13T12:00:00.000Z',
      durationMs: 0,
      httpStatus: 200,
      error: {
        code: 'TLE_INVALID_PAYLOAD',
        detail: 'CelesTrak returned an invalid TLE payload',
      },
    },
    jplCadProxy: {
      status: 'ok',
      checkedAt: '2026-08-13T12:00:00.000Z',
      durationMs: 0,
      httpStatus: 200,
      error: null,
    },
  })
})

test('readiness rejects JPL payloads missing required fields', async () => {
  const health = createHealthHandler({
    fetchImpl: dependencyFetch({
      jpl: async () => Response.json({ fields: ['des', 'cd', 'dist'], data: [] }),
    }),
    now: () => checkedAt,
  })
  const recorder = createResponse()

  await health({ method: 'GET', url: '/api/health?mode=ready' }, recorder.response)
  const result = recorder.result()

  assert.equal(result.statusCode, 503)
  assert.deepEqual(
    (result.body as { dependencies: Record<string, unknown> }).dependencies.jplCadProxy,
    {
      status: 'unavailable',
      checkedAt: '2026-08-13T12:00:00.000Z',
      durationMs: 0,
      httpStatus: 200,
      error: {
        code: 'JPL_INVALID_PAYLOAD',
        detail: 'JPL CAD response is missing required fields: v_rel',
      },
    },
  )
})

test('readiness preserves an actionable network failure reason', async () => {
  const health = createHealthHandler({
    fetchImpl: dependencyFetch({ tle: async () => { throw new Error('socket reset by peer') } }),
    now: () => checkedAt,
  })
  const recorder = createResponse()

  await health({ method: 'GET', url: '/api/health?mode=ready' }, recorder.response)
  const result = recorder.result()
  const tle = (result.body as {
    dependencies: { tleProxy: { httpStatus: number | null; error: { code: string; detail: string } } }
  }).dependencies.tleProxy

  assert.equal(result.statusCode, 503)
  assert.equal(tle.httpStatus, null)
  assert.deepEqual(tle.error, {
    code: 'TLE_NETWORK_ERROR',
    detail: 'CelesTrak request failed: socket reset by peer',
  })
})

test('readiness distinguishes dependency timeouts from other network failures', async () => {
  const health = createHealthHandler({
    fetchImpl: dependencyFetch({
      tle: async () => { throw new DOMException('request exceeded 7000 ms', 'AbortError') },
    }),
    now: () => checkedAt,
  })
  const recorder = createResponse()

  await health({ method: 'GET', url: '/api/health?mode=ready' }, recorder.response)
  const tle = (recorder.result().body as {
    dependencies: { tleProxy: { error: { code: string; detail: string } } }
  }).dependencies.tleProxy

  assert.deepEqual(tle.error, {
    code: 'TLE_TIMEOUT',
    detail: 'CelesTrak request timed out: request exceeded 7000 ms',
  })
})

test('readiness recognizes the Node 24 AbortSignal.timeout reason as a timeout', async () => {
  const signal = AbortSignal.timeout(0)
  await new Promise((resolve) => setTimeout(resolve, 1))
  const timeoutReason = signal.reason
  assert.equal(timeoutReason?.name, 'TimeoutError')

  const health = createHealthHandler({
    fetchImpl: dependencyFetch({ tle: async () => { throw timeoutReason } }),
    now: () => checkedAt,
  })
  const recorder = createResponse()

  await health({ method: 'GET', url: '/api/health?mode=ready' }, recorder.response)
  const tle = (recorder.result().body as {
    dependencies: { tleProxy: { error: { code: string; detail: string } } }
  }).dependencies.tleProxy

  assert.equal(tle.error.code, 'TLE_TIMEOUT')
  assert.match(tle.error.detail, /timed out: The operation was aborted due to timeout/)
})

test('readiness returns 200 with rich diagnostics when both payloads are valid', async () => {
  const health = createHealthHandler({ fetchImpl: dependencyFetch(), now: () => checkedAt })
  const recorder = createResponse()

  await health({ method: 'GET', url: '/api/health?mode=ready' }, recorder.response)
  const result = recorder.result()
  const dependencies = (result.body as {
    dependencies: Record<string, { status: string; checkedAt: string; durationMs: number; httpStatus: number; error: null }>
  }).dependencies

  assert.equal(result.statusCode, 200)
  for (const dependency of Object.values(dependencies)) {
    assert.deepEqual(dependency, {
      status: 'ok',
      checkedAt: '2026-08-13T12:00:00.000Z',
      durationMs: 0,
      httpStatus: 200,
      error: null,
    })
  }
})

test('health endpoint rejects unsupported methods', async () => {
  const health = createHealthHandler({ fetchImpl: dependencyFetch() })
  const recorder = createResponse()
  await health({ method: 'POST' }, recorder.response)
  const result = recorder.result()

  assert.equal(result.statusCode, 405)
  assert.equal(result.headers.get('Allow'), 'GET')
})

test('production smoke rejects legacy readiness strings and accepts rich healthy reports', () => {
  assert.throws(
    () => assertReadinessPayload({
      status: 'ready',
      dependencies: { tleProxy: 'ok', jplCadProxy: 'ok' },
    }),
    /invalid tleProxy readiness report/,
  )
  assert.doesNotThrow(() => assertReadinessPayload({
    status: 'ready',
    dependencies: {
      tleProxy: {
        status: 'ok',
        checkedAt: '2026-08-13T12:00:00.000Z',
        durationMs: 18,
        httpStatus: 200,
        error: null,
      },
      jplCadProxy: {
        status: 'ok',
        checkedAt: '2026-08-13T12:00:00.000Z',
        durationMs: 27,
        httpStatus: 200,
        error: null,
      },
    },
  }))
})
