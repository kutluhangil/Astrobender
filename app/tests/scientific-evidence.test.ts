import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { CELESTIAL_CATALOG } from '../src/lib/celestial-catalog.ts'
import { CELESTIAL_PHYSICAL_PROFILES } from '../src/lib/celestial-physical-profiles.ts'
import { getEarthSourceEvidence } from '../src/lib/earth-observatory.ts'
import { getJplCadEvidence } from '../src/lib/jpl-small-bodies.ts'
import { NAMED_SMALL_BODIES } from '../src/lib/jpl-small-bodies.ts'
import { PLANETS, getAllBodyIds } from '../src/lib/planets.ts'
import {
  EVIDENCE_CLASS_PRESENTATION,
  getActiveSceneEvidenceClasses,
  createPerseidHeuristicEvidence,
  formatEvidenceFreshness,
  validateEvidenceRegistry,
  validateEvidenceRecord,
  type EvidenceClass,
  type EvidenceRecord,
} from '../src/lib/scientific-evidence.ts'
import { createTlePropagationEvidence } from '../src/lib/scientific-evidence.ts'
import { getSkyEvents } from '../src/lib/sky-events.ts'

const VALID_BY_CLASS: Record<EvidenceClass, EvidenceRecord> = {
  live: {
    evidenceClass: 'live',
    publisher: 'USGS',
    sourceUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
    retrievedAt: '2026-08-13T08:15:00.000Z',
    verifiedAt: '2026-08-13',
    limitation: 'Feed may change between refreshes.',
  },
  calculated: {
    evidenceClass: 'calculated',
    publisher: 'CosineKitty',
    sourceUrl: 'https://github.com/cosinekitty/astronomy',
    verifiedAt: '2026-08-13',
    method: 'Astronomy Engine 2.1.19',
    epoch: '2026-08-13T08:15:00.000Z',
    uncertainty: 'Unknown; model output is rounded for display.',
  },
  'sourced-static': {
    evidenceClass: 'sourced-static',
    publisher: 'NASA',
    sourceUrl: 'https://science.nasa.gov/solar-system/',
    verifiedAt: '2026-07-26',
    uncertainty: 'Unknown where the publisher does not state one.',
  },
  schematic: {
    evidenceClass: 'schematic',
    publisher: 'ASTROBENDER',
    sourceUrl: '',
    verifiedAt: '2026-08-13',
    limitation: 'Not a catalog measurement.',
  },
  heuristic: {
    evidenceClass: 'heuristic',
    publisher: 'ASTROBENDER',
    sourceUrl: 'https://github.com/kutluhangil/Astrobender/blob/main/app/src/lib/perseid-watch.ts',
    verifiedAt: '2026-08-13',
    method: 'Product-authored observing heuristic',
    epoch: '2026-08-13T08:15:00.000Z',
    limitation: 'Not a scientific measurement.',
  },
}

test('evidence contract accepts all five explicit classes and their unknown uncertainty text', () => {
  assert.deepEqual(Object.keys(VALID_BY_CLASS), [
    'live',
    'calculated',
    'sourced-static',
    'schematic',
    'heuristic',
  ])
  for (const record of Object.values(VALID_BY_CLASS)) {
    assert.equal(validateEvidenceRecord(record), record)
  }
  assert.match(VALID_BY_CLASS['sourced-static'].uncertainty ?? '', /^Unknown/)
})

test('live evidence requires its actual retrieval timestamp', () => {
  const missingTimestamp = { ...VALID_BY_CLASS.live }
  delete missingTimestamp.retrievedAt
  assert.throws(
    () => validateEvidenceRecord(missingTimestamp as EvidenceRecord),
    /live evidence requires retrievedAt/i,
  )
})

test('calculated evidence requires a named method and explicit epoch', () => {
  assert.throws(
    () => validateEvidenceRecord({ ...VALID_BY_CLASS.calculated, method: undefined }),
    /calculated evidence requires method/i,
  )
  assert.throws(
    () => validateEvidenceRecord({ ...VALID_BY_CLASS.calculated, epoch: undefined }),
    /calculated evidence requires epoch/i,
  )
})

test('non-schematic evidence requires an HTTPS source URL while schematics may be source-free', () => {
  assert.throws(
    () => validateEvidenceRecord({ ...VALID_BY_CLASS.heuristic, sourceUrl: '' }),
    /heuristic evidence requires a source URL/i,
  )
  assert.throws(
    () => validateEvidenceRecord({ ...VALID_BY_CLASS.live, sourceUrl: 'http://example.test/feed' }),
    /sourceUrl must be an HTTPS URL/i,
  )
  assert.equal(validateEvidenceRecord(VALID_BY_CLASS.schematic), VALID_BY_CLASS.schematic)
})

test('evidence source URLs require a parseable HTTPS hostname', () => {
  assert.throws(
    () => validateEvidenceRecord({ ...VALID_BY_CLASS.live, sourceUrl: 'https://' }),
    /sourceUrl must be an HTTPS URL/i,
  )
})

test('evidence records require a verification date', () => {
  const missingVerifiedAt = { ...VALID_BY_CLASS['sourced-static'] }
  delete missingVerifiedAt.verifiedAt
  assert.throws(
    () => validateEvidenceRecord(missingVerifiedAt as EvidenceRecord),
    /verifiedAt is required/i,
  )
})

test('evidence dates reject invalid calendar values and reversed validity ranges', () => {
  assert.throws(
    () => validateEvidenceRecord({ ...VALID_BY_CLASS['sourced-static'], verifiedAt: '2026-02-30' }),
    /verifiedAt must be a valid ISO date/i,
  )
  assert.throws(
    () => validateEvidenceRecord({
      ...VALID_BY_CLASS['sourced-static'],
      validFrom: '2026-08-14T00:00:00.000Z',
      validUntil: '2026-08-13T00:00:00.000Z',
    }),
    /validUntil must not precede validFrom/i,
  )
})

test('evidence datetimes reject impossible calendar instants', () => {
  assert.throws(
    () => validateEvidenceRecord({ ...VALID_BY_CLASS.live, retrievedAt: '2026-02-30T08:15:00.000Z' }),
    /retrievedAt must be a valid ISO date/i,
  )
})

test('evidence presentation keeps class text, shape, and approved color distinct', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(EVIDENCE_CLASS_PRESENTATION).map(([key, value]) => [
      key,
      [value.shortLabel, value.color, value.symbol],
    ])),
    {
      live: ['LIVE', '#6EE7C1', '●'],
      calculated: ['CALC', '#7DD3FC', '◇'],
      'sourced-static': ['SOURCE', '#C4B5FD', '■'],
      schematic: ['SCHEMATIC', '#F6C86A', '△'],
      heuristic: ['HEURISTIC', '#FDBA74', '≈'],
    },
  )
})

test('scene truth classes appear only for an active schematic or product heuristic', () => {
  assert.deepEqual(
    getActiveSceneEvidenceClasses({ schematicActive: false, heuristicActive: false }),
    [],
  )
  assert.deepEqual(
    getActiveSceneEvidenceClasses({ schematicActive: true, heuristicActive: false }),
    ['schematic'],
  )
  assert.deepEqual(
    getActiveSceneEvidenceClasses({ schematicActive: false, heuristicActive: true }),
    ['heuristic'],
  )
})

test('freshness text exposes the original live timestamp instead of relabelling it', () => {
  assert.equal(
    formatEvidenceFreshness(VALID_BY_CLASS.live, 'tr', Date.parse('2026-08-13T08:16:00.000Z')),
    '1 dk',
  )
  assert.equal(
    formatEvidenceFreshness(VALID_BY_CLASS.calculated, 'en'),
    '2026-08-13 08:15Z',
  )
  assert.equal(
    formatEvidenceFreshness(VALID_BY_CLASS['sourced-static'], 'en'),
    'reviewed 2026',
  )
})

test('physical-profile JPL evidence is field-scoped to published rows and columns', () => {
  for (const bodyId of getAllBodyIds()) {
    const entry = CELESTIAL_CATALOG[bodyId]
    const profile = CELESTIAL_PHYSICAL_PROFILES[bodyId]
    assert.equal(entry.evidence.evidenceClass, 'sourced-static', `${bodyId} facts`)
    assert.equal(profile.evidence.temperature, null, `${bodyId} temperature is not supported by the JPL physical-parameter table`)
    assert.equal(profile.evidence.chemistry, null, `${bodyId} chemistry is not supported by the JPL physical-parameter table`)
    assert.equal(profile.temperature, null, `${bodyId} temperature stays unavailable without a body-specific primary source`)
    assert.equal(profile.chemistry, null, `${bodyId} chemistry stays unavailable without a body-specific primary source`)
    assert.equal(validateEvidenceRecord(entry.evidence), entry.evidence)

    for (const field of ['mass', 'density', 'gravity'] as const) {
      const evidence = profile.evidence[field]
      if (profile[field] === null) {
        assert.equal(evidence, null, `${bodyId} ${field} must not have a source badge without a published value`)
      } else {
        assert.ok(evidence, `${bodyId} ${field} must retain field evidence`)
        assert.equal(evidence.evidenceClass, 'sourced-static', `${bodyId} ${field}`)
        assert.match(evidence.sourceUrl, /^https:\/\/ssd\.jpl\.nasa\.gov\//, `${bodyId} ${field}`)
        assert.equal(validateEvidenceRecord(evidence), evidence)
      }
    }
  }

  const sun = CELESTIAL_PHYSICAL_PROFILES.sun
  assert.deepEqual(
    [sun.mass, sun.density, sun.gravity, sun.evidence.mass, sun.evidence.density, sun.evidence.gravity],
    [null, null, null, null, null, null],
    'the planetary JPL table has no Sun row',
  )

  const europa = CELESTIAL_PHYSICAL_PROFILES.europa
  assert.equal(europa.mass, null, 'the satellite JPL table publishes GM, not mass')
  assert.equal(europa.gravity, null, 'the satellite JPL table has no surface-gravity column')
  assert.equal(europa.evidence.mass, null)
  assert.equal(europa.evidence.gravity, null)
  assert.equal(europa.density, '3.0130 g/cm³')
  assert.equal(europa.evidence.density?.sourceUrl, 'https://ssd.jpl.nasa.gov/sats/phys_par/')

  const amalthea = CELESTIAL_PHYSICAL_PROFILES.amalthea
  assert.equal(amalthea.density, '1.0111 g/cm³')

  const eris = CELESTIAL_PHYSICAL_PROFILES.eris
  assert.deepEqual(
    [eris.mass, eris.density, eris.gravity],
    ['1.6600 × 10²² kg', '2.3 g/cm³', '0.77 m/s²'],
  )
})

test('retained JPL physical values exactly match their supported planetary or satellite columns', () => {
  const planetaryRows = {
    mercury: ['3.30103 × 10²³ kg', '5.4289 g/cm³', '3.70 m/s²'],
    venus: ['4.86731 × 10²⁴ kg', '5.243 g/cm³', '8.87 m/s²'],
    earth: ['5.97217 × 10²⁴ kg', '5.5134 g/cm³', '9.80 m/s²'],
    mars: ['6.41691 × 10²³ kg', '3.9340 g/cm³', '3.71 m/s²'],
    jupiter: ['1.898125 × 10²⁷ kg', '1.3262 g/cm³', '24.79 m/s²'],
    saturn: ['5.68317 × 10²⁶ kg', '0.6871 g/cm³', '10.44 m/s²'],
    uranus: ['8.68099 × 10²⁵ kg', '1.270 g/cm³', '8.87 m/s²'],
    neptune: ['1.024092 × 10²⁶ kg', '1.638 g/cm³', '11.15 m/s²'],
    ceres: ['9.38416 × 10²⁰ kg', '2.162 g/cm³', '0.27 m/s²'],
    pluto: ['1.30246 × 10²² kg', '1.853 g/cm³', '0.62 m/s²'],
    eris: ['1.6600 × 10²² kg', '2.3 g/cm³', '0.77 m/s²'],
    makemake: ['3.100 × 10²¹ kg', '2.1 g/cm³', '0.40 m/s²'],
    haumea: ['4.006 × 10²¹ kg', '2.6 g/cm³', '0.35 m/s²'],
  } as const

  for (const [bodyId, values] of Object.entries(planetaryRows)) {
    const profile = CELESTIAL_PHYSICAL_PROFILES[bodyId as keyof typeof CELESTIAL_PHYSICAL_PROFILES]
    assert.deepEqual([profile.mass, profile.density, profile.gravity], values, bodyId)
    for (const field of ['mass', 'density', 'gravity'] as const) {
      assert.equal(profile.evidence[field]?.sourceUrl, 'https://ssd.jpl.nasa.gov/planets/phys_par.html', `${bodyId} ${field}`)
    }
  }

  const satelliteBodyIds = PLANETS.flatMap((planet) => (planet.moons ?? []).map((moon) => moon.id))
  for (const bodyId of satelliteBodyIds) {
    const profile = CELESTIAL_PHYSICAL_PROFILES[bodyId]
    assert.equal(profile.mass, null, `${bodyId} has no direct satellite-table mass column`)
    assert.equal(profile.gravity, null, `${bodyId} has no direct satellite-table gravity column`)
    assert.equal(profile.evidence.mass, null, `${bodyId} mass evidence`)
    assert.equal(profile.evidence.gravity, null, `${bodyId} gravity evidence`)
    assert.equal(
      profile.density === null,
      profile.evidence.density === null,
      `${bodyId} density availability and evidence`,
    )
    if (profile.density !== null) {
      assert.equal(profile.evidence.density?.sourceUrl, 'https://ssd.jpl.nasa.gov/sats/phys_par/', `${bodyId} density source`)
    }
  }
})

test('live Earth and JPL evidence preserves the supplied source retrieval time', () => {
  const retrievedAt = Date.parse('2026-08-13T09:30:00.000Z')
  const usgs = getEarthSourceEvidence('usgs', retrievedAt)
  const jpl = getJplCadEvidence(retrievedAt)
  assert.equal(usgs.evidenceClass, 'live')
  assert.equal(usgs.publisher, 'USGS')
  assert.equal(usgs.retrievedAt, '2026-08-13T09:30:00.000Z')
  assert.equal(jpl.evidenceClass, 'live')
  assert.equal(jpl.publisher, 'NASA/JPL')
  assert.equal(jpl.retrievedAt, '2026-08-13T09:30:00.000Z')
})

test('Skywatch classifies model output as calculated and the IMO maximum as sourced static', () => {
  const events = getSkyEvents({
    start: new Date('2026-08-12T00:00:00.000Z'),
    end: new Date('2026-08-17T00:00:00.000Z'),
    language: 'en',
  })
  const meteor = events.find((event) => event.kind === 'meteor-shower')
  const calculated = events.find((event) => event.kind === 'maximum-elongation')
  assert.ok(meteor)
  assert.ok(calculated)
  assert.equal(meteor.evidence.evidenceClass, 'sourced-static')
  assert.equal(meteor.evidence.publisher, 'International Meteor Organization')
  assert.equal(calculated.evidence.evidenceClass, 'calculated')
  assert.equal(calculated.evidence.method, 'Astronomy Engine 2.1.19')
  assert.equal(calculated.evidence.epoch, calculated.startsAt)
})

test('TLE evidence names SGP4 and preserves both propagation epoch and source retrieval time', () => {
  const evidence = createTlePropagationEvidence({
    epochMs: Date.parse('2026-08-13T09:15:00.000Z'),
    fetchedAt: Date.parse('2026-08-13T09:20:00.000Z'),
    source: 'live',
  })
  assert.equal(evidence.evidenceClass, 'calculated')
  assert.equal(evidence.method, 'SGP4 via satellite.js 6.0.0')
  assert.equal(evidence.epoch, '2026-08-13T09:15:00.000Z')
  assert.equal(evidence.retrievedAt, '2026-08-13T09:20:00.000Z')
})

test('the named JPL small-body catalog carries sourced-static evidence per record', () => {
  for (const body of NAMED_SMALL_BODIES) {
    assert.equal(body.evidence.evidenceClass, 'sourced-static', body.id)
    assert.equal(body.evidence.sourceUrl, body.sourceUrl, body.id)
    assert.equal(validateEvidenceRecord(body.evidence), body.evidence)
  }
})

test('Perseid guidance evidence is explicitly heuristic at the observation epoch', () => {
  const evidence = createPerseidHeuristicEvidence('2026-08-13T09:45:00.000Z')
  assert.equal(evidence.evidenceClass, 'heuristic')
  assert.equal(evidence.epoch, '2026-08-13T09:45:00.000Z')
  assert.match(evidence.method ?? '', /radiant altitude.*Sun altitude.*Moon illumination/i)
  assert.match(evidence.limitation ?? '', /not a scientific measurement/i)
})

test('asset provenance retains only complete records for shipped project-original media', () => {
  const appRoot = fileURLToPath(new URL('../', import.meta.url))
  const registry = JSON.parse(readFileSync(`${appRoot}/public/data/asset-attributions.json`, 'utf8'))
  const textureManifest = JSON.parse(readFileSync(`${appRoot}/public/data/texture-manifest.json`, 'utf8'))
  const expectedFiles = [
    ...textureManifest.files.map(({ file }: { file: string }) => `textures/${file}`),
    ...readdirSync(`${appRoot}/public/icons`).map((file) => `icons/${file}`),
  ].sort()
  const attributedFiles = registry.assets.map(({ file }: { file: string }) => file).sort()
  assert.equal(registry.schemaVersion, 3)
  assert.deepEqual(attributedFiles, expectedFiles)

  for (const asset of registry.assets) {
    assert.match(asset.publisher, /\S/)
    assert.match(asset.providerUrl, /^https:\/\//)
    assert.match(asset.usagePolicy, /Copyright ASTROBENDER project owner/)
    assert.equal(asset.provenanceStatus, 'complete', asset.file)
    assert.match(asset.sourcePage, /^https:\/\//, asset.file)
    assert.match(asset.retrievedAt, /^\d{4}-\d{2}-\d{2}$/, asset.file)
    assert.match(asset.transformationNotes, /\S/)
    const digest = createHash('sha256')
      .update(readFileSync(`${appRoot}/public/${asset.file}`))
      .digest('hex')
    assert.equal(asset.sha256, digest, asset.file)
  }
})

test('evidence registry freshness validates every named group and reports the stale group', () => {
  const current = validateEvidenceRegistry([
    { id: 'catalog:earth:facts', evidence: VALID_BY_CLASS['sourced-static'] },
    { id: 'runtime:usgs', evidence: VALID_BY_CLASS.live },
  ], Date.parse('2026-08-13T12:00:00.000Z'), 120)
  assert.deepEqual(current, { checked: 2, oldestAgeDays: 18 })

  assert.throws(
    () => validateEvidenceRegistry([{
      id: 'catalog:stale',
      evidence: { ...VALID_BY_CLASS['sourced-static'], verifiedAt: '2025-01-01' },
    }], Date.parse('2026-08-13T12:00:00.000Z'), 120),
    /catalog:stale.*589 days.*maximum 120/i,
  )
})
