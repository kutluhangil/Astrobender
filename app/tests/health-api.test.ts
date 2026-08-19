import test from 'node:test'
import assert from 'node:assert/strict'
import health from '../../api/health.ts'

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

test('health endpoint is non-cacheable and exposes only safe readiness data', () => {
  const recorder = createResponse()
  health({ method: 'GET' }, recorder.response)
  const result = recorder.result()

  assert.equal(result.statusCode, 200)
  assert.equal(result.headers.get('Cache-Control'), 'no-store')
  assert.deepEqual((result.body as { dependencies: unknown }).dependencies, {
    tleProxy: 'configured',
    jplCadProxy: 'configured',
  })
})

test('health endpoint rejects unsupported methods', () => {
  const recorder = createResponse()
  health({ method: 'POST' }, recorder.response)
  const result = recorder.result()

  assert.equal(result.statusCode, 405)
  assert.equal(result.headers.get('Allow'), 'GET')
})
