import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SCALE_REFERENCE_AU,
  SCENE_UNITS_AT_ONE_AU,
  getScaleHonesty,
  getLiveDistances,
  getScaleRulerBars,
  getSizeHonesty,
} from '../src/lib/scene-scale.ts'
import {
  formatSolarClock,
  getSolarIllumination,
} from '../src/lib/solar-illumination.ts'

const AUGUST_2026 = Date.UTC(2026, 7, 19)

test('the compression curve keeps one AU at its own scene distance', () => {
  assert.ok(SCENE_UNITS_AT_ONE_AU > 0)
  const earth = getScaleHonesty('earth', AUGUST_2026)
  assert.ok(earth)
  assert.ok(Math.abs(earth.compression - 1) < 0.02, 'Earth is drawn at roughly true scale')
})

test('outer bodies are drawn progressively closer than they really are', () => {
  const compressions = ['mars', 'jupiter', 'neptune', 'sedna'].map((bodyId) => {
    const honesty = getScaleHonesty(bodyId as 'mars', AUGUST_2026)
    assert.ok(honesty, bodyId)
    return honesty.compression
  })

  assert.deepEqual(compressions, [...compressions].sort((a, b) => b - a))
  assert.ok(compressions.at(-1)! < 0.25, 'Sedna must be visibly compressed')
  for (const compression of compressions) assert.ok(compression > 0)
})

test('a moon is described by the orbit of the body it belongs to', () => {
  const europa = getScaleHonesty('europa', AUGUST_2026)
  const jupiter = getScaleHonesty('jupiter', AUGUST_2026)
  assert.ok(europa && jupiter)
  assert.equal(europa.bodyId, 'jupiter')
  assert.equal(europa.realAu, jupiter.realAu)
})

test('bodies without a heliocentric orbit report no scale reading', () => {
  assert.equal(getScaleHonesty('sun', AUGUST_2026), null)
  assert.equal(getScaleHonesty('moon', AUGUST_2026), null)
  assert.throws(() => getScaleHonesty('mars', Number.NaN), /Invalid simulation time/)
})

test('ruler bars stay inside the axis and reject a bad reference', () => {
  for (const bodyId of ['mercury', 'earth', 'neptune', 'sedna'] as const) {
    const honesty = getScaleHonesty(bodyId, AUGUST_2026)
    assert.ok(honesty)
    const bars = getScaleRulerBars(honesty, SCALE_REFERENCE_AU)
    assert.ok(bars.real >= 0 && bars.real <= 1, `${bodyId} real bar`)
    assert.ok(bars.drawn >= 0 && bars.drawn <= 1, `${bodyId} drawn bar`)
  }
  const mars = getScaleHonesty('mars', AUGUST_2026)!
  assert.throws(() => getScaleRulerBars(mars, 0), /positive AU value/)
})

test('the subsolar point tracks the solstices and equinoxes', () => {
  const equinox = getSolarIllumination(Date.parse('2026-03-20T12:00:00Z'), {
    latitude: 0, longitude: 0, label: 'null island',
  })
  assert.ok(Math.abs(equinox.subsolarLatitude) < 0.5)
  assert.ok(Math.abs(equinox.subsolarLongitude) < 3)

  const june = getSolarIllumination(Date.parse('2026-06-21T12:00:00Z'), {
    latitude: 0, longitude: 0, label: 'null island',
  })
  assert.ok(Math.abs(june.subsolarLatitude - 23.44) < 0.2)

  const december = getSolarIllumination(Date.parse('2026-12-21T12:00:00Z'), {
    latitude: 0, longitude: 0, label: 'null island',
  })
  assert.ok(Math.abs(december.subsolarLatitude + 23.44) < 0.2)
})

test('local solar time and daylight follow the observer longitude', () => {
  const noonUtc = Date.parse('2026-03-20T12:00:00Z')
  const greenwich = getSolarIllumination(noonUtc, { latitude: 51.48, longitude: 0, label: 'Greenwich' })
  assert.equal(formatSolarClock(greenwich.localSolarHours).slice(0, 2), '11')
  assert.equal(greenwich.daylight, true)

  const antipode = getSolarIllumination(noonUtc, { latitude: 0, longitude: 180, label: 'antimeridian' })
  assert.equal(antipode.daylight, false)
  assert.ok(antipode.sunAltitudeDeg < 0)
})

test('illumination rejects impossible observers and times', () => {
  assert.throws(
    () => getSolarIllumination(Number.NaN, { latitude: 0, longitude: 0, label: 'x' }),
    /Invalid illumination time/,
  )
  assert.throws(
    () => getSolarIllumination(AUGUST_2026, { latitude: 120, longitude: 0, label: 'x' }),
    /Observer latitude out of range/,
  )
  assert.throws(
    () => getSolarIllumination(AUGUST_2026, { latitude: 0, longitude: 200, label: 'x' }),
    /Observer longitude out of range/,
  )
  assert.throws(() => formatSolarClock(Number.NaN), /Invalid local solar hour/)
})

test('live distances use true heliocentric geometry, not the compressed scene', () => {
  const venus = getLiveDistances('venus', Date.UTC(2026, 9, 20))
  assert.ok(venus && venus.sunAu !== null && venus.earthAu !== null)
  assert.ok(Math.abs(venus.sunAu - 0.72) < 0.02, 'Venus orbits near 0.72 AU')
  assert.ok(venus.earthAu < 0.4, 'Venus is close to Earth just after its August 2026 conjunction')
  assert.ok(venus.lightSecondsFromEarth! > 100 && venus.lightSecondsFromEarth! < 300)

  const earth = getLiveDistances('earth', AUGUST_2026)
  assert.equal(earth?.earthAu, null)
  assert.ok(Math.abs(earth!.sunAu! - 1) < 0.02)
  assert.equal(getLiveDistances('moon', AUGUST_2026), null)
})

test('planet spheres are drawn at their catalogued radius and only the Sun is shrunk', () => {
  for (const bodyId of ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']) {
    const size = getSizeHonesty(bodyId as 'mars')
    assert.ok(size, bodyId)
    assert.ok(Math.abs(size.ratio - 1) < 0.05, `${bodyId} drawn at ${size.ratio} of true radius`)
  }
  const sun = getSizeHonesty('sun')
  assert.ok(sun && sun.ratio < 0.05, 'the Sun is the declared exception')
})
