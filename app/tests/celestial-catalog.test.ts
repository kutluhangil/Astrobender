import assert from 'node:assert/strict'
import test from 'node:test'
import { CELESTIAL_CATALOG } from '../src/lib/celestial-catalog.ts'
import { CELESTIAL_FUN_FACTS_EN } from '../src/lib/celestial-facts.ts'
import {
  CELESTIAL_PHYSICAL_PROFILES,
  JPL_PHYSICAL_PARAMETERS_URL,
  JPL_SATELLITE_PARAMETERS_URL,
} from '../src/lib/celestial-physical-profiles.ts'
import { SATELLITE_ELEMENTS } from '../src/lib/orbital-mechanics.ts'
import { PLANETS, getAllBodyIds } from '../src/lib/planets.ts'

test('catalog covers every selectable rendered body with a dated primary source', () => {
  const bodyIds = getAllBodyIds()
  assert.equal(new Set(bodyIds).size, bodyIds.length)
  assert.equal(bodyIds.length, 46)

  for (const bodyId of bodyIds) {
    const entry = CELESTIAL_CATALOG[bodyId]
    assert.equal(entry.id, bodyId)
    assert.match(entry.sourceUrl, /^https:\/\/science\.nasa\.gov\//)
    assert.equal(entry.verifiedAt, '2026-07-26')
    assert.ok(CELESTIAL_FUN_FACTS_EN[bodyId].length > 20)
  }
})

test('every selectable body exposes only field-scoped sourced measurements and unavailable chemistry fields', () => {
  for (const bodyId of getAllBodyIds()) {
    const profile = CELESTIAL_PHYSICAL_PROFILES[bodyId]
    assert.equal(profile.temperature, null, `${bodyId} temperature`)
    assert.equal(profile.chemistry, null, `${bodyId} chemistry`)
    for (const field of ['mass', 'density', 'gravity'] as const) {
      assert.equal(
        profile[field] === null,
        profile.evidence[field] === null,
        `${bodyId} ${field} availability and evidence must agree`,
      )
    }
  }
  assert.deepEqual(
    [
      CELESTIAL_PHYSICAL_PROFILES.sun.mass,
      CELESTIAL_PHYSICAL_PROFILES.sun.density,
      CELESTIAL_PHYSICAL_PROFILES.sun.gravity,
    ],
    [null, null, null],
  )
  assert.match(JPL_PHYSICAL_PARAMETERS_URL, /^https:\/\/ssd\.jpl\.nasa\.gov\//)
  assert.match(JPL_SATELLITE_PARAMETERS_URL, /^https:\/\/ssd\.jpl\.nasa\.gov\//)
})

test('major satellite models have orbital elements and complete systems retain moon totals', () => {
  const modeledMoonIds = PLANETS.flatMap((planet) =>
    (planet.moons ?? []).map((moon) => moon.id),
  )
  for (const moonId of [
    'charon',
    'styx',
    'nix',
    'kerberos',
    'hydra',
    'amalthea',
    'himalia',
    'pan',
    'hyperion',
    'larissa',
    'mimas',
    'iapetus',
    'miranda',
    'ariel',
    'nereid',
  ]) {
    assert.ok(modeledMoonIds.includes(moonId as (typeof modeledMoonIds)[number]), moonId)
    assert.ok(moonId in SATELLITE_ELEMENTS, moonId)
  }

  const moonTotals = Object.fromEntries(
    PLANETS.filter((planet) => planet.knownMoonCount !== undefined).map((planet) => [
      planet.id,
      planet.knownMoonCount,
    ]),
  )
  assert.deepEqual(moonTotals, {
    jupiter: 101,
    saturn: 274,
    uranus: 29,
    neptune: 16,
    pluto: 5,
    ceres: 0,
    haumea: 2,
    makemake: 1,
    eris: 1,
  })
})

test('all four giant planets expose their observed ring systems', () => {
  const ringed = PLANETS.filter((planet) => planet.ring).map((planet) => planet.id)
  assert.deepEqual(ringed, ['jupiter', 'saturn', 'uranus', 'neptune'])
})
