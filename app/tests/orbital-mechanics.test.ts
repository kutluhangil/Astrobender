import assert from 'node:assert/strict'
import test from 'node:test'
import {
  J2000_MS,
  PLANETARY_ELEMENTS,
  SATELLITE_ELEMENTS,
  compressDistanceAu,
  getGeocentricScenePositions,
  getSatelliteScenePosition,
  heliocentricPositionAu,
  solveEccentricAnomaly,
  type PlanetaryBodyId,
} from '../src/lib/orbital-mechanics.ts'

test('planetary elements preserve the real Solar System ordering', () => {
  const orderedIds = [
    'mercury',
    'venus',
    'earth',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
  ] as const
  const axes = orderedIds.map((id) => PLANETARY_ELEMENTS[id].semiMajorAxisAu.base)

  assert.deepEqual(axes, [...axes].sort((a, b) => a - b))
  assert.equal(PLANETARY_ELEMENTS.earth.semiMajorAxisAu.base, 1.00000261)
  assert.equal(PLANETARY_ELEMENTS.jupiter.semiMajorAxisAu.base, 5.202887)
  assert.equal(PLANETARY_ELEMENTS.neptune.semiMajorAxisAu.base, 30.06992276)
})

test('JPL Kepler solver returns finite heliocentric positions at J2000', () => {
  for (const id of Object.keys(PLANETARY_ELEMENTS) as Array<keyof typeof PLANETARY_ELEMENTS>) {
    const position = heliocentricPositionAu(id, J2000_MS)
    const distance = Math.hypot(position.x, position.y, position.z)
    const elements = PLANETARY_ELEMENTS[id]
    const minDistance = elements.semiMajorAxisAu.base * (1 - elements.eccentricity.base)
    const maxDistance = elements.semiMajorAxisAu.base * (1 + elements.eccentricity.base)

    assert.ok(Number.isFinite(distance), `${id} position must be finite`)
    assert.ok(distance >= minDistance - 1e-9, `${id} must not be inside perihelion`)
    assert.ok(distance <= maxDistance + 1e-9, `${id} must not be outside aphelion`)
  }
})

test('modeled dwarf planets have finite distinct heliocentric positions', () => {
  const positions = ['ceres', 'haumea', 'makemake', 'eris'].map((bodyId) =>
    heliocentricPositionAu(bodyId as PlanetaryBodyId, J2000_MS),
  )
  for (const position of positions) {
    assert.ok(Number.isFinite(position.x))
    assert.ok(Number.isFinite(position.y))
    assert.ok(Number.isFinite(position.z))
  }
  assert.equal(new Set(positions.map((position) => Math.hypot(position.x, position.y, position.z).toFixed(3))).size, 4)
})

/**
 * Equatorial (ICRF) heliocentric vectors read from the JPL Horizons API for
 * 2026-08-19 00:00 TDB, `CENTER='500@10'`, `REF_PLANE='FRAME'`. They pin the
 * J2000 re-anchoring applied to the SBDB osculating elements: a phase mistake
 * in that conversion moves a body by astronomical units, not metres.
 */
const HORIZONS_2026_08_19_AU: Record<string, { x: number; y: number; z: number }> = {
  vesta: { x: 2.388728, y: 0.329150, z: -0.181760 },
  pallas: { x: 2.874196, y: 0.410935, z: -0.290362 },
  hygiea: { x: -1.985054, y: 2.358301, z: 0.923333 },
  juno: { x: 1.670564, y: -2.121328, z: -0.466564 },
  psyche: { x: -1.884592, y: 2.168168, z: 0.876235 },
  quaoar: { x: 8.394590, y: -40.291808, z: -11.018718 },
  gonggong: { x: 81.805317, y: -33.586215, z: -15.829338 },
  sedna: { x: 38.825706, y: 72.095191, z: 12.722798 },
}

test('small-body elements reproduce the JPL Horizons vectors for 2026-08-19', () => {
  const timeMs = Date.UTC(2026, 7, 19)
  for (const [bodyId, reference] of Object.entries(HORIZONS_2026_08_19_AU)) {
    const position = heliocentricPositionAu(bodyId as PlanetaryBodyId, timeMs)
    const errorAu = Math.hypot(
      position.x - reference.x,
      position.y - reference.y,
      position.z - reference.z,
    )
    assert.ok(errorAu < 0.001, `${bodyId} deviates ${errorAu.toFixed(6)} au from Horizons`)
  }
})

test('the Kepler solver converges on near-parabolic eccentricities', () => {
  // 1P/Halley sits at e = 0.968, where the naive M + e sin M starter stalls.
  for (const eccentricity of [0, 0.5, 0.86, 0.95, 0.968, 0.99]) {
    for (let step = 0; step < 64; step++) {
      const meanAnomaly = (step / 64) * Math.PI * 2
      const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, eccentricity)
      const residual = Math.abs(
        Math.sin(eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly)) -
          Math.sin(meanAnomaly),
      )
      assert.ok(residual < 1e-9, `e=${eccentricity} M=${meanAnomaly} residual ${residual}`)
    }
  }
})

test('the Kepler solver rejects parabolic and hyperbolic eccentricities', () => {
  assert.throws(() => solveEccentricAnomaly(1, 1), /Elliptical eccentricity must be in \[0, 1\)/)
  assert.throws(() => solveEccentricAnomaly(1, 1.4), /Elliptical eccentricity must be in \[0, 1\)/)
  assert.throws(() => solveEccentricAnomaly(Number.NaN, 0.2), /Invalid Kepler input/)
})

test('compressed distances stay navigable without changing orbital ordering', () => {
  const distances = [0.39, 0.72, 1, 1.52, 5.2, 9.58, 19.22, 30.05, 39.48]
  const compressed = distances.map(compressDistanceAu)

  assert.deepEqual(compressed, [...compressed].sort((a, b) => a - b))
  assert.ok(compressed.at(-1)! < 320)
  assert.ok(compressed[0] > 15)
})

test('geocentric scene keeps Earth at the origin and the Sun one compressed AU away', () => {
  const positions = getGeocentricScenePositions(J2000_MS)
  const earthHeliocentric = heliocentricPositionAu('earth', J2000_MS)
  const earthDistanceAu = Math.hypot(
    earthHeliocentric.x,
    earthHeliocentric.y,
    earthHeliocentric.z,
  )

  assert.deepEqual(positions.earth, { x: 0, y: 0, z: 0 })
  assert.ok(
    Math.abs(
      Math.hypot(positions.sun.x, positions.sun.y, positions.sun.z) -
        compressDistanceAu(earthDistanceAu),
    ) < 1e-9,
  )
})

test('major moons use bounded mean elements and remain within their orbital bounds', () => {
  for (const [id, elements] of Object.entries(SATELLITE_ELEMENTS)) {
    const position = getSatelliteScenePosition(id as keyof typeof SATELLITE_ELEMENTS, J2000_MS)
    const distance = Math.hypot(position.x, position.y, position.z)
    const sceneAxis = elements.semiMajorAxisKm / elements.kmPerSceneUnit

    assert.ok(distance >= sceneAxis * (1 - elements.eccentricity) - 1e-9, `${id} periapsis`)
    assert.ok(distance <= sceneAxis * (1 + elements.eccentricity) + 1e-9, `${id} apoapsis`)
  }
})
