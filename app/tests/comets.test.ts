import assert from 'node:assert/strict'
import test from 'node:test'
import { COMETS, COMET_MARKER_RADIUS, findComet } from '../src/lib/comets.ts'
import {
  PLANETARY_ELEMENTS,
  heliocentricPositionAu,
  samplePlanetOrbitScene,
} from '../src/lib/orbital-mechanics.ts'

test('every comet has Keplerian elements that match its published shape', () => {
  assert.equal(COMETS.length, 3)
  for (const comet of COMETS) {
    const elements = PLANETARY_ELEMENTS[comet.id]
    assert.ok(elements, `${comet.id} elements`)

    const semiMajorAxis = elements.semiMajorAxisAu.base
    const eccentricity = elements.eccentricity.base
    assert.ok(Math.abs(eccentricity - comet.eccentricity) < 0.001, `${comet.id} eccentricity`)
    assert.ok(
      Math.abs(semiMajorAxis * (1 - eccentricity) - comet.perihelionAu) < 0.005,
      `${comet.id} perihelion`,
    )
    assert.ok(
      Math.abs(semiMajorAxis * (1 + eccentricity) - comet.aphelionAu) < 0.05,
      `${comet.id} aphelion`,
    )
    assert.ok(
      Math.abs(elements.inclinationDeg.base - comet.inclinationDeg) < 0.01,
      `${comet.id} inclination`,
    )
    assert.match(comet.sourceUrl, /^https:\/\/ssd\.jpl\.nasa\.gov\/tools\/sbdb_lookup\.html#\//)
    assert.ok(comet.horizonsDriftAu >= 0, `${comet.id} drift must be recorded`)
  }
})

test('near-parabolic comet orbits stay finite across the whole ellipse', () => {
  for (const comet of COMETS) {
    const points = samplePlanetOrbitScene(comet.id, Date.UTC(2026, 7, 19), 256)
    assert.equal(points.length, 257)
    for (const point of points) {
      assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z))
    }
    const radii = points.map((point) => Math.hypot(point.x, point.y, point.z))
    // A degenerate solve would collapse the ellipse to a ring of one radius.
    assert.ok(Math.max(...radii) / Math.min(...radii) > 2, `${comet.id} orbit is not elongated`)
  }
})

test('comet positions stay between perihelion and aphelion', () => {
  for (const comet of COMETS) {
    for (let day = 0; day < 400; day += 17) {
      const position = heliocentricPositionAu(comet.id, Date.UTC(2026, 0, 1) + day * 86_400_000)
      const distance = Math.hypot(position.x, position.y, position.z)
      assert.ok(distance >= comet.perihelionAu - 1e-6, `${comet.id} inside perihelion on day ${day}`)
      assert.ok(distance <= comet.aphelionAu + 1e-6, `${comet.id} beyond aphelion on day ${day}`)
    }
  }
})

test('comets are looked up by id and share one marker size', () => {
  assert.equal(findComet('halley')?.designation, '1P/Halley')
  assert.equal(findComet('not-a-comet'), undefined)
  assert.ok(COMET_MARKER_RADIUS > 0)
})
