import assert from 'node:assert/strict'
import test from 'node:test'
import {
  J2000_MS,
  PLANETARY_ELEMENTS,
  SCHEMATIC_PLANETARY_BODY_IDS,
  SATELLITE_ELEMENTS,
  compressDistanceAu,
  getGeocentricScenePositions,
  getSatelliteScenePosition,
  heliocentricPositionAu,
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

test('Kepler solver returns finite heliocentric positions at J2000', () => {
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
  assert.deepEqual(SCHEMATIC_PLANETARY_BODY_IDS, ['pluto', 'ceres', 'haumea', 'makemake', 'eris'])
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
