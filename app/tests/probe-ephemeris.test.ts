import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PROBE_EPHEMERIS_META,
  getProbeCoverage,
  getProbeHeliocentricAu,
  hasProbeEphemeris,
} from '../src/lib/probe-ephemeris.ts'
import { DEEP_SPACE_PROBES } from '../src/lib/probes.ts'

test('every rendered probe ships a Horizons table and declares its source', () => {
  assert.match(PROBE_EPHEMERIS_META.source, /^https:\/\/ssd\.jpl\.nasa\.gov\/horizons\//)
  assert.equal(PROBE_EPHEMERIS_META.centre, 'Sun (500@10)')
  assert.equal(PROBE_EPHEMERIS_META.referencePlane, 'ICRF equatorial')

  for (const probe of DEEP_SPACE_PROBES) {
    assert.equal(hasProbeEphemeris(probe.id), probe.rendered, `${probe.id} coverage`)
  }
})

/**
 * Reference vectors read from the JPL Horizons API for 2026-08-24 00:00 TDB,
 * `CENTER='500@10'`, `REF_PLANE='FRAME'` — deliberately between samples so the
 * interpolator, not just the stored rows, is under test.
 */
const HORIZONS_2026_08_24_AU: Record<string, { x: number; y: number; z: number }> = {
  voyager1: { x: -32.117590, y: -164.552247, z: 36.321498 },
  newhorizons: { x: 20.730670, y: -57.792277, z: -22.571250 },
}

test('interpolated positions land on the Horizons vectors between samples', () => {
  const timeMs = Date.UTC(2026, 7, 24)
  for (const [probeId, reference] of Object.entries(HORIZONS_2026_08_24_AU)) {
    const position = getProbeHeliocentricAu(probeId, timeMs)
    assert.ok(position, `${probeId} must be inside its coverage window`)
    const error = Math.hypot(
      position.x - reference.x,
      position.y - reference.y,
      position.z - reference.z,
    )
    assert.ok(error < 1e-4, `${probeId} deviates ${error.toExponential(2)} au from Horizons`)
  }
})

test('positions outside the solution window are refused rather than extrapolated', () => {
  const coverage = getProbeCoverage('juno')
  assert.ok(coverage)
  assert.ok(coverage.sampleCount > 100)
  assert.ok(coverage.stepDays > 0)

  assert.equal(getProbeHeliocentricAu('juno', coverage.startMs - 86_400_000), null)
  assert.equal(getProbeHeliocentricAu('juno', coverage.endMs + 86_400_000), null)
  assert.ok(getProbeHeliocentricAu('juno', coverage.startMs))
  assert.ok(getProbeHeliocentricAu('juno', coverage.endMs))
})

test('an unknown probe reports no coverage and an invalid time raises', () => {
  assert.equal(getProbeCoverage('sputnik'), null)
  assert.equal(hasProbeEphemeris('sputnik'), false)
  assert.equal(getProbeHeliocentricAu('sputnik', Date.UTC(2026, 7, 24)), null)
  assert.throws(
    () => getProbeHeliocentricAu('voyager1', Number.NaN),
    /Invalid probe ephemeris time/,
  )
})

test('sampled trajectories stay continuous across the whole window', () => {
  const coverage = getProbeCoverage('parker-solar-probe')
  assert.ok(coverage)
  let previous = getProbeHeliocentricAu('parker-solar-probe', coverage.startMs)
  assert.ok(previous)
  for (let timeMs = coverage.startMs + 86_400_000; timeMs < coverage.endMs; timeMs += 86_400_000) {
    const current = getProbeHeliocentricAu('parker-solar-probe', timeMs)
    assert.ok(current, `no sample at ${new Date(timeMs).toISOString()}`)
    const step = Math.hypot(
      current.x - previous.x,
      current.y - previous.y,
      current.z - previous.z,
    )
    // Parker touches about 192 km/s at perihelion, which is 0.11 au in a day.
    // Anything past 0.15 au means the interpolation jumped rather than moved.
    assert.ok(step < 0.15, `discontinuity of ${step} au at ${new Date(timeMs).toISOString()}`)
    previous = current
  }
})
