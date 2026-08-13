import assert from 'node:assert/strict'
import test from 'node:test'
import { Body, Illumination, SearchLunarEclipse } from 'astronomy-engine'
import { CELESTIAL_FACTS } from '../src/lib/celestial-facts.ts'
import { CELESTIAL_PHYSICAL_PROFILES } from '../src/lib/celestial-physical-profiles.ts'
import {
  CONSTELLATIONS,
  IAU_CONSTELLATIONS,
  IAU_CONSTELLATIONS_SOURCE_URL,
} from '../src/lib/constellations.ts'
import { LANDING_SITES } from '../src/lib/landing-sites.ts'
import { METEOR_CALENDAR_BY_YEAR } from '../src/lib/meteor-calendar.ts'
import {
  SCHEMATIC_PLANETARY_BODY_IDS,
} from '../src/lib/orbital-mechanics.ts'
import { PLANETS } from '../src/lib/planets.ts'
import { DEEP_SPACE_PROBES, probeDistanceAuAt } from '../src/lib/probes.ts'
import { getPerseidWatch } from '../src/lib/perseid-watch.ts'
import { getSkyEvents } from '../src/lib/sky-events.ts'

test('meteor events come only from the reviewed 2026 IMO calendar', () => {
  assert.deepEqual(Object.keys(METEOR_CALENDAR_BY_YEAR), ['2026'])
  assert.deepEqual(
    METEOR_CALENDAR_BY_YEAR[2026].map((record) => record.id),
    ['perseids'],
  )
  const [perseidRecord] = METEOR_CALENDAR_BY_YEAR[2026]
  assert.equal('peakAt' in perseidRecord, false)

  const supportedEvents = getSkyEvents({
    start: new Date('2026-01-01T00:00:00Z'),
    end: new Date('2026-12-31T23:59:59Z'),
    language: 'en',
  }).filter((event) => event.kind === 'meteor-shower')
  assert.deepEqual(supportedEvents.map((event) => event.id), ['meteor-perseids-2026'])
  assert.equal(supportedEvents[0]?.startsAt, '2026-08-13T02:00:00.000Z')
  assert.equal(supportedEvents[0]?.endsAt, '2026-08-13T04:00:00.000Z')
  assert.notEqual(supportedEvents[0]?.startsAt, '2026-08-13T03:00:00.000Z')

  const overlappingEvents = getSkyEvents({
    start: new Date('2026-08-13T03:00:00Z'),
    end: new Date('2026-08-13T03:30:00Z'),
    language: 'en',
  }).filter((event) => event.kind === 'meteor-shower')
  assert.deepEqual(overlappingEvents.map((event) => event.id), ['meteor-perseids-2026'])
  assert.equal(overlappingEvents[0]?.startsAt, '2026-08-13T02:00:00.000Z')
  assert.equal(overlappingEvents[0]?.endsAt, '2026-08-13T04:00:00.000Z')

  const afterWindowEvents = getSkyEvents({
    start: new Date('2026-08-13T04:01:00Z'),
    end: new Date('2026-08-13T05:00:00Z'),
    language: 'en',
  }).filter((event) => event.kind === 'meteor-shower')
  assert.deepEqual(afterWindowEvents, [])

  const unsupportedEvents = getSkyEvents({
    start: new Date('2027-01-01T00:00:00Z'),
    end: new Date('2027-12-31T23:59:59Z'),
    language: 'en',
  }).filter((event) => event.kind === 'meteor-shower')
  assert.deepEqual(unsupportedEvents, [])
})

test('lunar eclipse start and end symmetrically surround the calculated peak', () => {
  const event = getSkyEvents({
    start: new Date('2026-08-01T00:00:00Z'),
    end: new Date('2026-08-31T23:59:59Z'),
    language: 'en',
  }).find((candidate) => candidate.kind === 'lunar-eclipse')
  assert.ok(event)
  assert.ok(event.endsAt)

  const peakMs = SearchLunarEclipse(new Date('2026-08-01T00:00:00Z')).peak.date.getTime()
  const startsAtMs = Date.parse(event.startsAt)
  const endsAtMs = Date.parse(event.endsAt)
  assert.ok(startsAtMs < peakMs)
  assert.ok(endsAtMs > peakMs)
  assert.ok(Math.abs((peakMs - startsAtMs) - (endsAtMs - peakMs)) <= 1)
})

test('Perseid product heuristic calculates every astronomical input at one instant', () => {
  const observationAt = new Date('2026-07-18T03:00:00Z')
  const watch = getPerseidWatch(
    observationAt,
    { latitude: 41.0082, longitude: 28.9784, label: 'Istanbul' },
  )
  assert.ok(watch?.observer)
  assert.equal(watch.observedAt, observationAt.toISOString())
  assert.equal('peakAt' in watch, false)
  assert.equal(
    watch.moonIlluminationPercent,
    Math.round(Illumination(Body.Moon, observationAt).phase_fraction * 100),
  )
  assert.ok(watch.observer.productHeuristic >= 0)
  assert.ok(watch.observer.productHeuristic <= 100)
  assert.equal('astronomicalScore' in watch.observer, false)
})

test('duplicated catalog claims use primary-source uncertainty language consistently', () => {
  assert.match(CELESTIAL_FACTS.mercury.atmosphere, /ekzosfer/i)
  assert.doesNotMatch(CELESTIAL_FACTS.mercury.atmosphere, /^Yok/)
  assert.match(CELESTIAL_FACTS.europa.funFactTr, /düşünül|olası/i)
  assert.match(CELESTIAL_FACTS.titan.atmosphere, /%95.*%5/)
  assert.match(CELESTIAL_PHYSICAL_PROFILES.titan.chemistry.tr, /%95.*%5/)
  assert.match(CELESTIAL_FACTS.ariel.atmosphere, /doğrulanmış atmosfer yok/i)
  assert.match(CELESTIAL_FACTS.titania.atmosphere, /doğrulanmış atmosfer yok/i)
  assert.match(CELESTIAL_PHYSICAL_PROFILES.ariel.chemistry.en, /surface/i)
  assert.match(CELESTIAL_PHYSICAL_PROFILES.titania.chemistry.en, /no atmosphere detected/i)
  assert.match(CELESTIAL_PHYSICAL_PROFILES.makemake.chemistry.en, /may develop/i)

  const uranus = PLANETS.find((planet) => planet.id === 'uranus')
  assert.equal(uranus?.knownMoonCount, 29)
  assert.match(CELESTIAL_FACTS.uranus.moonsCount, /^29 /)
})

test('unreferenced dwarf-planet scene elements are explicitly schematic', () => {
  assert.deepEqual(
    SCHEMATIC_PLANETARY_BODY_IDS,
    ['pluto', 'ceres', 'haumea', 'makemake', 'eris'],
  )
})

test('every surface site requires a primary source and uses far-side terminology', () => {
  for (const site of LANDING_SITES) {
    assert.match(site.sourceUrl, /^https:\/\//, site.id)
  }
  const change4 = LANDING_SITES.find((site) => site.id === 'change4')
  assert.ok(change4)
  assert.match(change4.nameTr, /uzak yüz/i)
  assert.doesNotMatch(`${change4.nameTr} ${change4.detailsTr}`, /karanlık yüz/i)

  const venera13 = LANDING_SITES.find((site) => site.id === 'venera13')
  assert.ok(venera13)
  assert.equal(
    venera13.sourceUrl,
    'https://www.nasa.gov/wp-content/uploads/2023/04/sp-4524.pdf#page=141',
  )
  assert.notEqual(
    venera13.sourceUrl,
    'https://nssdc.gsfc.nasa.gov/imgcat/html/ency_captions/ency_cd/html/v13_vg261_262.html',
  )
  assert.doesNotMatch(venera13.sourceUrl, /nssdc\.gsfc\.nasa\.gov\/nmc\/spacecraft\/display\.action/)
  assert.match(venera13.detailsTr, /465°C.*89,5 atmosfer.*127 dakika/i)
})

test('the IAU name catalog ships without unsupported line figures', () => {
  assert.equal(
    IAU_CONSTELLATIONS_SOURCE_URL,
    'https://iauarchive.eso.org/public/themes/constellations/',
  )
  assert.equal(IAU_CONSTELLATIONS.length, 88)
  assert.equal(CONSTELLATIONS.length, 0)
  assert.ok(IAU_CONSTELLATIONS.every((entry) => entry.renderedFigure === false))
})

test('missions without source-backed ephemeris records remain unplotted', () => {
  assert.ok(DEEP_SPACE_PROBES.every((probe) => probe.rendered === false))
  const voyager = DEEP_SPACE_PROBES.find((probe) => probe.id === 'voyager1')
  assert.ok(voyager)
  assert.throws(
    () => probeDistanceAuAt(voyager, voyager.referenceEpochMs),
    /no source-backed ephemeris/i,
  )
})
