import assert from 'node:assert/strict'
import test from 'node:test'
import {
  NAMED_SMALL_BODIES,
  closeApproachTimeMs,
  lunarDistances,
  parseCloseApproaches,
  resolveApproachBody,
  upcomingCloseApproaches,
  type CloseApproach,
} from '../src/lib/jpl-small-bodies.ts'
import { getAllBodyIds } from '../src/lib/planets.ts'
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
    [
      'ceres', 'pallas', 'juno', 'vesta', 'hygiea', 'psyche', 'quaoar', 'gonggong',
      'sedna', 'eros', 'bennu', 'ryugu', 'apophis', 'halley', '67p',
    ],
  )
  const renderedIds = new Set<string>(getAllBodyIds())
  for (const body of NAMED_SMALL_BODIES) {
    assert.match(body.sourceUrl, /^https:\/\/ssd\.jpl\.nasa\.gov\/tools\/sbdb_lookup\.html#\//)
    assert.ok(body.designations.length > 0, `${body.id} needs at least one designation`)
    if (body.bodyId) {
      assert.ok(renderedIds.has(body.bodyId), `${body.id} points at an unrendered body`)
    }
  }
})

const approach = (designation: string, fullName: string, date: string, distanceAu: number): CloseApproach => ({
  designation,
  fullName,
  closeApproachDate: date,
  distanceAu,
  minimumDistanceAu: null,
  maximumDistanceAu: null,
  relativeVelocityKmS: 9.4,
  diameterKm: null,
  sourceUrl: 'https://ssd-api.jpl.nasa.gov/cad.api',
})

test('close-approach dates parse from the JPL CAD calendar format', () => {
  assert.equal(closeApproachTimeMs('2026-Jul-27 05:20'), Date.UTC(2026, 6, 27, 5, 20))
  assert.equal(closeApproachTimeMs('2029-Apr-13'), Date.UTC(2029, 3, 13))
  assert.throws(() => closeApproachTimeMs('27/07/2026'), /Unrecognized JPL CAD close-approach date/)
  assert.throws(() => closeApproachTimeMs('2026-Xyz-27 05:20'), /Unrecognized month in JPL CAD date/)
})

test('live close approaches resolve to the catalogued body and drop past rows', () => {
  const rows = [
    approach('2026 AB', '(2026 AB)', '2026-Sep-02 11:00', 0.012),
    approach('99942', '99942 Apophis (2004 MN4)', '2026-Aug-30 04:00', 0.031),
    approach('433', '433 Eros (A898 PA)', '2026-Jul-01 04:00', 0.15),
  ]
  const upcoming = upcomingCloseApproaches(rows, Date.UTC(2026, 7, 19))

  assert.deepEqual(upcoming.map((highlight) => highlight.approach.designation), ['99942', '2026 AB'])
  assert.equal(upcoming[0].namedBody?.id, 'apophis')
  assert.equal(upcoming[1].namedBody, null)
  assert.throws(() => upcomingCloseApproaches(rows, Number.NaN), /Invalid reference time/)
})

test('close approaches match a catalogued body by designation or full name', () => {
  assert.equal(resolveApproachBody(approach('4', '4 Vesta (A807 FA)', '2026-Sep-02', 0.9))?.bodyId, 'vesta')
  assert.equal(resolveApproachBody(approach('', '162173 Ryugu (1999 JU3)', '2026-Sep-02', 0.9))?.id, 'ryugu')
  assert.equal(resolveApproachBody(approach('2026 ZZ', '(2026 ZZ)', '2026-Sep-02', 0.9)), null)
})

test('close-approach distances convert to lunar distances and reject bad input', () => {
  assert.equal(Math.round(lunarDistances(0.00256955529)), 1)
  assert.ok(Math.abs(lunarDistances(0.0128477764) - 5) < 1e-6)
  assert.throws(() => lunarDistances(-1), /finite non-negative AU value/)
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
