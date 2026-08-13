import assert from 'node:assert/strict'
import test from 'node:test'
import {
  reduceEarthRefreshUpdatedAt,
  reduceSmallBodyRefreshFailure,
  TLE_SNAPSHOT_DOWNLOADED_AT,
} from '../src/lib/tle-snapshot-metadata.ts'

test('failed Earth refresh retains the last valid source timestamp', () => {
  const failedSources = [
    { status: 'rejected', reason: new Error('EONET unavailable') },
    { status: 'rejected', reason: new Error('USGS unavailable') },
    { status: 'rejected', reason: new Error('NOAA unavailable') },
  ] satisfies PromiseRejectedResult[]

  assert.equal(
    reduceEarthRefreshUpdatedAt(1_700_000_000_000, failedSources, 1_800_000_000_000),
    1_700_000_000_000,
  )
})

test('failed JPL refresh retains the last valid Small Bodies state timestamp and payload', () => {
  const approaches = [{ designation: '2026 AB' }]
  const current = {
    status: 'loading' as const,
    approaches,
    error: null,
    updatedAt: 1_700_000_000_000,
  }

  const next = reduceSmallBodyRefreshFailure(current, 'JPL CAD request failed')

  assert.equal(next.status, 'error')
  assert.equal(next.updatedAt, 1_700_000_000_000)
  assert.equal(next.approaches, approaches)
  assert.equal(next.error, 'JPL CAD request failed')
})

test('successful refresh advances the source timestamp and packaged TLE metadata is fixed', () => {
  const partialSuccess = [
    { status: 'fulfilled', value: [] },
    { status: 'rejected', reason: new Error('USGS unavailable') },
  ] satisfies PromiseSettledResult<unknown>[]

  assert.equal(
    reduceEarthRefreshUpdatedAt(1_700_000_000_000, partialSuccess, 1_800_000_000_000),
    1_800_000_000_000,
  )
  assert.equal(TLE_SNAPSHOT_DOWNLOADED_AT, Date.parse('2026-07-16T11:24:19Z'))
})
