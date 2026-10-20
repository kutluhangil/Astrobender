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

test('health endpoint probes each upstream and reports degraded service without failing', async () => {
  const originalFetch = globalThis.fetch
  const requested: string[] = []
  globalThis.fetch = async (input, init) => {
    requested.push(`${init?.method ?? 'GET'} ${String(input)}`)
    if (String(input).startsWith('https://celestrak.org/')) throw new Error('connect ETIMEDOUT')
    return new Response('{"count":0}', { status: 200 })
  }
  try {
    const recorder = createResponse()
    await health({ method: 'GET' }, recorder.response)
    const result = recorder.result()
    const body = result.body as {
      status: string
      upstreams: Record<string, { state: string; detail: string }>
    }

    assert.equal(result.statusCode, 200)
    assert.equal(result.headers.get('Cache-Control'), 'public, s-maxage=60, stale-while-revalidate=60')
    assert.equal(body.status, 'degraded')
    assert.equal(body.upstreams.jplCad.state, 'up')
    assert.equal(body.upstreams.celestrak.state, 'down')
    assert.match(body.upstreams.celestrak.detail, /ETIMEDOUT/)
    // CelesTrak is only touched with a HEAD on its home page, never a GP download.
    assert.ok(requested.includes('HEAD https://celestrak.org/'))
    assert.ok(!requested.some((entry) => entry.includes('gp.php')))
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('health endpoint reports ok when every upstream answers', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response('', { status: 200 })
  try {
    const recorder = createResponse()
    await health({ method: 'GET' }, recorder.response)
    assert.equal((recorder.result().body as { status: string }).status, 'ok')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('health endpoint rejects unsupported methods', async () => {
  const recorder = createResponse()
  await health({ method: 'POST' }, recorder.response)
  const result = recorder.result()

  assert.equal(result.statusCode, 405)
  assert.equal(result.headers.get('Allow'), 'GET')
})
