import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CONSTELLATIONS,
  IAU_CONSTELLATIONS,
  IAU_CONSTELLATIONS_SOURCE_URL,
} from '../src/lib/constellations.ts'
import { LANDING_SITES } from '../src/lib/landing-sites.ts'
import { searchObservatory } from '../src/lib/unified-search.ts'
import type { SatInfo } from '../src/lib/satellites.ts'
import type { SkyEvent } from '../src/lib/sky-events.ts'

const SATELLITES: SatInfo[] = [{
  name: 'ISS (ZARYA)',
  norad: 25544,
  l1: '',
  l2: '',
  group: 0,
  epochMs: 0,
}]

test('IAU catalog contains every official constellation exactly once', () => {
  assert.equal(
    IAU_CONSTELLATIONS_SOURCE_URL,
    'https://iauarchive.eso.org/public/themes/constellations/',
  )
  assert.equal(IAU_CONSTELLATIONS.length, 88)
  assert.equal(new Set(IAU_CONSTELLATIONS.map((entry) => entry.name)).size, 88)
  assert.equal(new Set(IAU_CONSTELLATIONS.map((entry) => entry.abbreviation)).size, 88)
  assert.equal(CONSTELLATIONS.length, 0)
  assert.equal(IAU_CONSTELLATIONS.filter((entry) => entry.renderedFigure).length, 0)
})

test('surface catalog requires sources and includes Earth launch, observatory, and deep-space-network sites', () => {
  const earthSites = LANDING_SITES.filter((site) => site.bodyId === 'earth')
  assert.ok(earthSites.some((site) => site.kind === 'launch'))
  assert.ok(earthSites.some((site) => site.kind === 'observatory'))
  assert.ok(earthSites.some((site) => site.kind === 'ground-station'))
  assert.ok(earthSites.some((site) => site.id === 'kandilli-observatory'))
  for (const site of LANDING_SITES) {
    assert.match(site.sourceUrl, /^https:\/\//)
  }
})

test('unified search resolves NORAD, bilingual bodies, surface sites, missions and constellations', () => {
  const sources = { satellites: SATELLITES, earthEvents: [], closeApproaches: [] }
  assert.equal(searchObservatory('25544', sources, 'tr')[0]?.kind, 'satellite')
  assert.equal(searchObservatory('Dünya', sources, 'tr')[0]?.kind, 'body')
  assert.equal(searchObservatory('Kandilli', sources, 'tr')[0]?.kind, 'surface-site')
  assert.equal(searchObservatory('Europa Clipper', sources, 'en')[0]?.kind, 'mission')
  const orion = searchObservatory('Ori', sources, 'en')[0]
  assert.ok(orion)
  assert.equal(orion.kind, 'constellation')
  if (orion.kind !== 'constellation') throw new Error('Expected Orion constellation')
  assert.equal(orion.constellation.abbreviation, 'Ori')
})

test('unified search exposes current Skywatch events', () => {
  const skyEvent: SkyEvent = {
    id: 'meteor-perseids-2026',
    kind: 'meteor-shower',
    title: 'Perseid Meteor Yağmuru',
    summary: '',
    guidance: '',
    startsAt: '2026-08-12T00:00:00.000Z',
    endsAt: null,
    sourceUrl: 'https://science.nasa.gov/',
    targetBody: 'earth',
    visibility: 'global',
  }
  const result = searchObservatory('Perseid', {
    satellites: SATELLITES,
    earthEvents: [],
    closeApproaches: [],
    skyEvents: [skyEvent],
  }, 'tr')[0]
  assert.equal(result?.kind, 'sky-event')
})
