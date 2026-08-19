import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getHorizonsProbeRecord,
  HORIZONS_PROBE_RECORDS,
  validateHorizonsProbeRecord,
} from '../src/lib/horizons-records.ts'
import { DEEP_SPACE_PROBES, probeDistanceAuAt, probePositionAu } from '../src/lib/probes.ts'

test('reviewed Horizons records retain source URL, retrieval review, TDB epoch, ICRF frame, and position vector', () => {
  const voyager = getHorizonsProbeRecord('voyager1')
  assert.ok(voyager)
  assert.equal(voyager.epoch.value, '2026-08-13T00:00:00.000')
  assert.equal(voyager.epoch.timeScale, 'TDB')
  assert.equal(voyager.frame, 'ICRF')
  assert.equal(voyager.center, 'Sun (10)')
  assert.deepEqual(voyager.positionAu, {
    x: -32.10443738848591,
    y: -164.4480619300801,
    z: 36.29858453724886,
  })
  assert.match(voyager.sourceUrl, /^https:\/\/ssd\.jpl\.nasa\.gov\/api\/horizons\.api\?/) 
  assert.equal(voyager.retrievedAt, '2026-08-13T05:53:24.000Z')
  assert.equal(voyager.reviewedAt, '2026-08-13')
  assert.match(voyager.limitation, /1992/i)
})

test('Horizons record validation rejects missing frame or invalid vectors and unsupported missions remain unavailable', () => {
  const voyager = HORIZONS_PROBE_RECORDS[0]
  assert.throws(
    () => validateHorizonsProbeRecord({ ...voyager, frame: '' }),
    /frame/i,
  )
  assert.throws(
    () => validateHorizonsProbeRecord({ ...voyager, positionAu: { ...voyager.positionAu, x: Number.NaN } }),
    /positionAu\.x/i,
  )
  assert.equal(getHorizonsProbeRecord('europa-clipper'), null)
})

test('only a mission with a reviewed Horizons record is plotted, preserving its source epoch rather than extrapolating', () => {
  const voyager = DEEP_SPACE_PROBES.find((probe) => probe.id === 'voyager1')
  const clipper = DEEP_SPACE_PROBES.find((probe) => probe.id === 'europa-clipper')
  assert.ok(voyager)
  assert.ok(clipper)
  assert.equal(voyager.rendered, true)
  assert.equal(voyager.ephemeris?.frame, 'ICRF')
  assert.deepEqual(probePositionAu(voyager), {
    x: -32.10443738848591,
    y: -164.4480619300801,
    z: 36.29858453724886,
  })
  assert.ok(Math.abs(probeDistanceAuAt(voyager, Date.UTC(2026, 7, 20)) - 171.4393397444078) < 1e-9)
  assert.equal(clipper.rendered, false)
  assert.equal(clipper.ephemeris, null)
  assert.match(clipper.ephemerisNoteTr, /kullanılamıyor/i)
})
