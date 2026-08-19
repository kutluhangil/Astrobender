import assert from 'node:assert/strict'
import test from 'node:test'
import {
  NAMED_SMALL_BODIES,
  parseCloseApproaches,
} from '../src/lib/jpl-small-bodies.ts'
import { DEEP_SPACE_PROBES, probeDistanceAuAt } from '../src/lib/probes.ts'

test('JPL CAD parser maps dynamic fields and physical values', () => {
  const approaches = parseCloseApproaches({
    signature: { source: 'NASA/JPL SBDB Close Approach Data API', version: '1.5' },
    count: '1',
    fields: ['des', 'cd', 'dist', 'dist_min', 'dist_max', 'v_rel', 'diameter', 'fullname'],
    data: [['2026 AB', '2026-Jul-27 05:20', '0.012', '0.011', '0.013', '12.4', '0.14', '(2026 AB)']],
  })
  assert.deepEqual(approaches[0], {
    designation: '2026 AB',
    fullName: '(2026 AB)',
    closeApproachDate: '2026-Jul-27 05:20',
    distanceAu: 0.012,
    minimumDistanceAu: 0.011,
    maximumDistanceAu: 0.013,
    relativeVelocityKmS: 12.4,
    diameterKm: 0.14,
    sourceUrl: 'https://ssd-api.jpl.nasa.gov/cad.api',
  })
})

test('JPL CAD parser raises an actionable error for missing fields', () => {
  assert.throws(
    () => parseCloseApproaches({ fields: ['des'], data: [['A']] }),
    /missing required fields: cd, dist, v_rel/,
  )
})

test('named small-body catalog covers requested asteroids, comets, and Ceres', () => {
  assert.deepEqual(
    NAMED_SMALL_BODIES.map((body) => body.id),
    ['ceres', 'vesta', 'eros', 'bennu', 'ryugu', 'halley', '67p'],
  )
  for (const body of NAMED_SMALL_BODIES) {
    assert.match(body.sourceUrl, /^https:\/\/ssd\.jpl\.nasa\.gov\/tools\/sbdb_lookup\.html#\//)
  }
})

test('deep-space estimates react to simulation time and non-ephemeris missions stay unplotted', () => {
  const voyager = DEEP_SPACE_PROBES.find((probe) => probe.id === 'voyager1')
  const clipper = DEEP_SPACE_PROBES.find((probe) => probe.id === 'europa-clipper')
  assert.ok(voyager)
  assert.ok(clipper)
  assert.ok(probeDistanceAuAt(voyager, voyager.referenceEpochMs + 86_400_000) > voyager.distanceAu)
  assert.equal(clipper.rendered, false)
  assert.match(clipper.ephemerisNoteTr, /3D konum gösterilmiyor/)
})
