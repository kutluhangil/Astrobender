import assert from 'node:assert/strict'
import test from 'node:test'
import { IAU_CONSTELLATIONS } from '../src/lib/constellations.ts'
import { LANDING_SITES } from '../src/lib/landing-sites.ts'
import { searchObservatory } from '../src/lib/unified-search.ts'
import type { SatInfo } from '../src/lib/satellites.ts'
import type { SkyEvent } from '../src/lib/sky-events.ts'

const SATELLITES: SatInfo[] = [{
  name: 'ISS (ZARYA)',
  norad: 25544,
  elements: {
    name: 'ISS (ZARYA)',
    norad: 25544,
    objectId: '1998-067A',
    epoch: '2026-07-18T06:21:44.482752',
    epochMs: 0,
    meanMotion: 15.5,
    eccentricity: 0.0006,
    inclination: 51.64,
    raOfAscNode: 247.4,
    argOfPericenter: 130.5,
    meanAnomaly: 325,
    bstar: 0.0001,
    meanMotionDot: 0.0001,
    meanMotionDdot: 0,
  },
  group: 0,
  epochMs: 0,
}]

test('IAU catalog contains every official constellation exactly once', () => {
  assert.equal(IAU_CONSTELLATIONS.length, 88)
  assert.equal(new Set(IAU_CONSTELLATIONS.map((entry) => entry.name)).size, 88)
  assert.equal(new Set(IAU_CONSTELLATIONS.map((entry) => entry.abbreviation)).size, 88)
  assert.equal(IAU_CONSTELLATIONS.filter((entry) => entry.renderedFigure).length, 88)
})

test('Earth surface catalog includes launch, observatory, and deep-space-network sites', () => {
  const earthSites = LANDING_SITES.filter((site) => site.bodyId === 'earth')
  assert.ok(earthSites.some((site) => site.kind === 'launch'))
  assert.ok(earthSites.some((site) => site.kind === 'observatory'))
  assert.ok(earthSites.some((site) => site.kind === 'ground-station'))
  assert.ok(earthSites.some((site) => site.id === 'kandilli-observatory'))
  for (const site of earthSites) {
    assert.match(site.sourceUrl ?? '', /^https:\/\//)
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
