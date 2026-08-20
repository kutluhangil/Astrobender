import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  BRIGHT_STAR_COUNT,
  BRIGHT_STAR_MAGNITUDE_LIMIT,
  CELESTIAL_SPHERE_RADIUS,
  buildStarFieldBuffers,
  colourFromBv,
  equatorialToScene,
  starIndexByDesignation,
  starMagnitude,
  starPosition,
} from '../src/lib/star-catalog.ts'
import { CONSTELLATIONS } from '../src/lib/constellations.ts'
import { compressDistanceAu } from '../src/lib/orbital-mechanics.ts'

/**
 * Published J2000 positions, from SIMBAD. The catalogue is a generated file, so
 * these anchor it to coordinates that can be checked against a third party
 * rather than against the generator that produced it.
 */
const REFERENCE_STARS = [
  { designation: 'Alp CMA', name: 'Sirius', ra: 101.2871, dec: -16.7161, magnitude: -1.46 },
  { designation: 'Alp UMI', name: 'Polaris', ra: 37.9529, dec: 89.2642, magnitude: 2.02 },
  { designation: 'Alp LYR', name: 'Vega', ra: 279.2346, dec: 38.7836, magnitude: 0.03 },
  { designation: 'Alp ORI', name: 'Betelgeuse', ra: 88.7929, dec: 7.4069, magnitude: 0.5 },
]

test('catalogued stars sit at their published equatorial coordinates', () => {
  for (const star of REFERENCE_STARS) {
    const index = starIndexByDesignation(star.designation)
    const scene = starPosition(index)
    const expected = equatorialToScene(star.ra, star.dec)

    assert.ok(
      Math.hypot(scene.x - expected.x, scene.y - expected.y, scene.z - expected.z) < 1e-6,
      `${star.name} is not at its published position`,
    )
    assert.equal(starMagnitude(index), star.magnitude, `${star.name} magnitude`)
  }
})

test('the equatorial transform preserves the pole and the vernal equinox', () => {
  const pole = equatorialToScene(0, 90)
  assert.ok(Math.abs(pole.z - CELESTIAL_SPHERE_RADIUS) < 1e-9)
  assert.ok(Math.hypot(pole.x, pole.y) < 1e-9)

  const equinox = equatorialToScene(0, 0)
  assert.ok(Math.abs(equinox.x - CELESTIAL_SPHERE_RADIUS) < 1e-9)
  assert.ok(Math.hypot(equinox.y, equinox.z) < 1e-9)
})

test('an out-of-range star index raises instead of returning a placeholder', () => {
  assert.throws(() => starPosition(BRIGHT_STAR_COUNT), /Star index out of range/)
  assert.throws(() => starIndexByDesignation('Alp XYZ'), /No bright star catalogued/)
  assert.throws(() => equatorialToScene(Number.NaN, 0), /Invalid equatorial coordinate/)
})

test('the star field buffers cover the whole catalogue on one sphere', () => {
  const { positions, colours, sizes } = buildStarFieldBuffers()

  assert.equal(BRIGHT_STAR_COUNT, 8404)
  assert.equal(positions.length, BRIGHT_STAR_COUNT * 3)
  assert.equal(colours.length, BRIGHT_STAR_COUNT * 3)
  assert.equal(sizes.length, BRIGHT_STAR_COUNT)

  for (let index = 0; index < BRIGHT_STAR_COUNT; index++) {
    const radius = Math.hypot(
      positions[index * 3],
      positions[index * 3 + 1],
      positions[index * 3 + 2],
    )
    assert.ok(
      Math.abs(radius - CELESTIAL_SPHERE_RADIUS) < 1e-2,
      `Star ${index} is off the celestial sphere at ${radius}`,
    )
    assert.ok(sizes[index] > 0 && sizes[index] <= 4.2, `Star ${index} size ${sizes[index]}`)
  }
})

test('point size tracks magnitude, so bright stars read as brighter', () => {
  const { sizes } = buildStarFieldBuffers()
  const sirius = sizes[starIndexByDesignation('Alp CMA')]
  const polaris = sizes[starIndexByDesignation('Alp UMI')]

  assert.ok(sirius > polaris, `Sirius (${sirius}) must outshine Polaris (${polaris})`)
  // Nothing fainter than the catalogue limit is drawn, so nothing collapses to
  // a zero-width point.
  const faintest = Math.min(...sizes)
  assert.ok(faintest > 0.5, `Faintest drawn star was ${faintest}`)
  assert.equal(BRIGHT_STAR_MAGNITUDE_LIMIT, 6.5)
})

test('B-V colours run blue for hot stars and red for cool ones', () => {
  const [rigelR, , rigelB] = colourFromBv(-0.03)
  const [betelgeuseR, , betelgeuseB] = colourFromBv(1.85)

  assert.ok(rigelB > rigelR, 'Rigel must be bluer than it is red')
  assert.ok(betelgeuseR > betelgeuseB, 'Betelgeuse must be redder than it is blue')
  for (const channel of [...colourFromBv(-0.4), ...colourFromBv(2.0)]) {
    assert.ok(channel >= 0 && channel <= 1, `Colour channel out of gamut: ${channel}`)
  }
})

test('constellation figures are drawn on the same sphere as the stars', () => {
  assert.equal(CONSTELLATIONS.length, 88)
  for (const constellation of CONSTELLATIONS) {
    assert.ok(constellation.points.length > 0, `${constellation.name} has no lines`)
    for (const [x, y, z] of constellation.points) {
      const radius = Math.hypot(x, y, z)
      assert.ok(
        Math.abs(radius - CELESTIAL_SPHERE_RADIUS) < 1e-2,
        `${constellation.name} endpoint is off the celestial sphere at ${radius}`,
      )
    }
  }
})

test('the scene paints the catalogued sky instead of procedural noise', () => {
  const source = readFileSync('src/lib/globe-engine.ts', 'utf8')

  assert.match(source, /buildStarFieldBuffers\(\)/)
  assert.doesNotMatch(
    source,
    /private makeStars\(\)[\s\S]{0,900}?Math\.random\(\)/,
    'the star field must come from the catalogue, not from Math.random',
  )
  // Stars and constellation figures share one shell that rides with the camera,
  // so no viewpoint can end up outside its own sky.
  assert.match(source, /this\.skyGroup\.add\(this\.makeStars\(\)\)/)
  assert.match(source, /this\.skyGroup\.add\(this\.constellationGroup\)/)
  assert.match(source, /this\.anchorSky\(\)\s*\n\s*this\.composer\.render\(\)/)
})

test('the celestial sphere encloses every viewpoint the camera can reach', () => {
  const source = readFileSync('src/lib/globe-engine.ts', 'utf8')
  const maxDistance = Number(/this\.controls\.maxDistance = ([\d.]+)/.exec(source)?.[1])
  const farPlane = Number(/new THREE\.PerspectiveCamera\([\d.]+, [^,]+, [\d.]+, ([\d.]+)\)/.exec(source)?.[1])
  assert.ok(Number.isFinite(maxDistance) && Number.isFinite(farPlane))

  // Sedna's aphelion is the widest orbit the scene draws.
  const widestOrbit = compressDistanceAu(936)
  assert.ok(
    CELESTIAL_SPHERE_RADIUS > maxDistance + widestOrbit,
    `Sky radius ${CELESTIAL_SPHERE_RADIUS} does not clear ${maxDistance} + ${widestOrbit}`,
  )
  assert.ok(CELESTIAL_SPHERE_RADIUS < farPlane, 'the sky must stay inside the far plane')
})
