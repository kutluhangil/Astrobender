import assert from 'node:assert/strict'
import test from 'node:test'
import handler, { OUTPUT_COLUMNS, compactGpCsv } from '../../api/tle.ts'
import { OMM_CSV_COLUMNS, parseOmmCsv } from '../src/lib/omm.ts'

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

// CelesTrak's full GP CSV header, plus a quoted name with a comma and an
// object above 99999, which the TLE format could not represent.
const CELESTRAK_CSV = [
  'OBJECT_NAME,OBJECT_ID,EPOCH,MEAN_MOTION,ECCENTRICITY,INCLINATION,RA_OF_ASC_NODE,ARG_OF_PERICENTER,MEAN_ANOMALY,EPHEMERIS_TYPE,CLASSIFICATION_TYPE,NORAD_CAT_ID,ELEMENT_SET_NO,REV_AT_EPOCH,BSTAR,MEAN_MOTION_DOT,MEAN_MOTION_DDOT',
  'ISS (ZARYA),1998-067A,2026-07-18T06:21:44.482752,15.50103472,.0006703,51.6416,247.4627,130.536,325.0288,0,U,25544,999,56353,.1027E-3,.00016717,0',
  '"DEMO, SAT",2026-140B,2026-10-19T12:00:00.000000,15.2,.0001,97.4,10,20,30,0,U,100123,999,10,.0002,.00001,0',
  'BROKEN ROW,2026-001A,,15.2,.0001,97.4,10,20,30,0,U,100124,999,10,.0002,.00001,0',
].join('\r\n')

test('GP proxy requests OMM CSV, compacts it, and keeps catalog numbers above 99999', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl = ''
  globalThis.fetch = async (input) => {
    requestedUrl = String(input)
    return new Response(CELESTRAK_CSV, { status: 200 })
  }
  try {
    const response = createResponse()
    await handler({ method: 'GET', url: '/api/tle?feed=active' }, response)

    assert.match(requestedUrl, /GROUP=active&FORMAT=csv$/)
    assert.equal(response.statusCode, 200)
    assert.equal(response.headers.get('Content-Type'), 'text/csv; charset=utf-8')
    assert.equal(response.headers.get('Cache-Control'), 'public, s-maxage=900, stale-while-revalidate=3600')
    assert.equal(response.headers.get('X-Astrobender-Dropped-Rows'), '1')

    const { records, skipped } = parseOmmCsv(String(response.body))
    assert.equal(skipped, 0)
    assert.deepEqual(records.map((record) => [record.norad, record.name]), [
      [25544, 'ISS (ZARYA)'],
      [100123, 'DEMO, SAT'],
    ])
    assert.equal(records[0].bstar, 0.0001027)
    assert.equal(records[0].eccentricity, 0.0006703)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('GP proxy output columns match the client OMM contract', () => {
  assert.deepEqual([...OUTPUT_COLUMNS], [...OMM_CSV_COLUMNS])
  assert.equal(compactGpCsv(CELESTRAK_CSV).rows, 2)
})

test('GP proxy turns a CelesTrak notice into a 502 with the upstream text', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response('GP data has not updated since your last successful download of GROUP=active', { status: 200 })
  try {
    const response = createResponse()
    await handler({ method: 'GET', url: '/api/tle?feed=active' }, response)
    assert.equal(response.statusCode, 502)
    assert.match(String((response.body as { error: string }).error), /header is missing .*GP data has not updated/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('GP proxy reports an unreachable upstream as a timeout', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new Error('The operation was aborted due to timeout')
  }
  try {
    const response = createResponse()
    await handler({ method: 'GET', url: '/api/tle?feed=visual' }, response)
    assert.equal(response.statusCode, 504)
    assert.match(String((response.body as { error: string }).error), /CelesTrak visual request failed after 10000 ms/)
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

test('proxy compaction and the client parser agree on BOM, CRLF, quotes and embedded line breaks', () => {
  const tricky = '﻿' + [
    'OBJECT_NAME,OBJECT_ID,EPOCH,MEAN_MOTION,ECCENTRICITY,INCLINATION,RA_OF_ASC_NODE,ARG_OF_PERICENTER,MEAN_ANOMALY,EPHEMERIS_TYPE,CLASSIFICATION_TYPE,NORAD_CAT_ID,ELEMENT_SET_NO,REV_AT_EPOCH,BSTAR,MEAN_MOTION_DOT,MEAN_MOTION_DDOT',
    '"QUOTED ""NAME"", WITH COMMA",2026-140B,2026-10-19T12:00:00.000000,15.2,.0001,97.4,10,20,30,0,U,100123,999,10,.0002,.00001,0',
    '"LINE\nBREAK",2026-140C,2026-10-19T12:00:00.000000,15.2,.0001,97.4,10,20,30,0,U,100124,999,10,.2E-3,1E-5,0',
    'MISSING,2026-140D,2026-10-19T12:00:00.000000,,.0001,97.4,10,20,30,0,U,100125,999,10,.0002,.00001,0',
  ].join('\r\n')
  const direct = parseOmmCsv(tricky)
  const viaProxy = parseOmmCsv(compactGpCsv(tricky).csv)
  assert.deepEqual(viaProxy.records, direct.records)
  assert.equal(direct.skipped, 1)
  assert.equal(compactGpCsv(tricky).dropped, 1)
})
