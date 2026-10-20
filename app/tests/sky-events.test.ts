import assert from 'node:assert/strict'
import test from 'node:test'
import { getSkyEvents } from '../src/lib/sky-events.ts'
import { directionLabel, getPerseidWatch } from '../src/lib/perseid-watch.ts'
import { METEOR_SHOWERS, findMeteorShower, showerApparition } from '../src/lib/meteor-showers.ts'
import { eventDayKey } from '../src/lib/skywatch-calendar.ts'

test('Skywatch includes NASA-verified August 2026 eclipses in chronological order', () => {
  const events = getSkyEvents({
    start: new Date('2026-08-01T00:00:00Z'),
    end: new Date('2026-08-31T23:59:59Z'),
    language: 'tr',
  })

  assert.ok(events.some((event) => event.kind === 'solar-eclipse' && event.startsAt.startsWith('2026-08-12')))
  assert.ok(events.some((event) => event.kind === 'lunar-eclipse' && event.startsAt.startsWith('2026-08-28')))
  assert.ok(events.some((event) => event.kind === 'meteor-shower' && /Perseid/i.test(event.title)))
  const perseid = events.find((event) => event.id === 'meteor-perseids-2026')
  // IMO 2026 calendar: maximum 2026 August 13, 02h–04h UT.
  assert.ok(perseid && perseid.startsAt >= '2026-08-13T02:00' && perseid.startsAt <= '2026-08-13T04:00', perseid?.startsAt)
  assert.deepEqual(
    [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map((event) => event.id),
    events.map((event) => event.id),
  )
  assert.ok(events.every((event) => event.sourceUrl.startsWith('https://')))
})

test('Perseid Watch reproduces the IMO 2026 window and calculates a local astronomical score', () => {
  const watch = getPerseidWatch(
    new Date('2026-08-13T03:00:00Z'),
    { latitude: 41.0082, longitude: 28.9784, label: 'İstanbul' },
  )

  assert.equal(watch.status, 'peak')
  assert.equal(watch.year, 2026)
  assert.equal(watch.peakStart, '2026-08-13T02:00:00.000Z')
  assert.equal(watch.peakEnd, '2026-08-13T04:00:00.000Z')
  assert.equal(watch.zhr, '100')
  assert.equal(watch?.activeStart, '2026-07-17T00:00:00.000Z')
  assert.equal(watch?.activeEnd, '2026-08-24T23:59:59.999Z')
  assert.equal(watch?.moonIlluminationPercent, 0)
  assert.equal(watch?.observer?.label, 'İstanbul')
  assert.ok((watch?.observer?.radiantAltitudeDegrees ?? -1) > 0)
  assert.ok((watch?.observer?.astronomicalScore ?? -1) >= 0)
  assert.ok((watch?.observer?.astronomicalScore ?? 101) <= 100)
  assert.equal(directionLabel(45, 'tr'), 'KD')
  assert.equal(directionLabel(225, 'en'), 'SW')
})

test('Perseid Watch rolls to next season and reproduces the IMO 2027 window', () => {
  const afterSeason = getPerseidWatch(new Date('2026-10-20T00:00:00Z'))
  assert.equal(afterSeason.year, 2027)
  assert.equal(afterSeason.status, 'upcoming')
  // IMO 2027 calendar: maximum 2027 August 13, 08h–10h UT, ZHR 110+.
  assert.equal(afterSeason.peakStart, '2027-08-13T08:00:00.000Z')
  assert.equal(afterSeason.peakEnd, '2027-08-13T10:00:00.000Z')
  assert.equal(afterSeason.zhr, '110+')
  assert.equal(afterSeason.sourceUrl, 'https://www.imo.net/ShCal27s.pdf')
})

test('Skywatch calendar groups every event by its UTC day', () => {
  const [firstEvent] = getSkyEvents({
    start: new Date('2026-08-01T00:00:00Z'),
    end: new Date('2026-08-31T23:59:59Z'),
    language: 'tr',
  })
  assert.equal(eventDayKey(firstEvent), firstEvent.startsAt.slice(0, 10))
})

test('Skywatch rejects an inverted window and labels unlocated solar visibility', () => {
  assert.throws(
    () => getSkyEvents({
      start: new Date('2026-09-01T00:00:00Z'),
      end: new Date('2026-08-01T00:00:00Z'),
      language: 'en',
    }),
    /end.*start/i,
  )

  const events = getSkyEvents({
    start: new Date('2026-08-01T00:00:00Z'),
    end: new Date('2026-08-31T00:00:00Z'),
    language: 'en',
  })
  assert.equal(events.find((event) => event.kind === 'solar-eclipse')?.visibility, 'location-required')
})

test('the 2026-08-12 total solar eclipse is visible from Reykjavik and Madrid', () => {
  for (const observer of [
    { latitude: 64.15, longitude: -21.94, label: 'Reykjavik' },
    { latitude: 40.42, longitude: -3.7, label: 'Madrid' },
  ]) {
    const events = getSkyEvents({
      start: new Date('2026-08-01T00:00:00Z'),
      end: new Date('2026-08-31T23:59:59Z'),
      observer,
      language: 'en',
    })
    const solar = events.find((event) => event.kind === 'solar-eclipse')
    assert.equal(solar?.visibility, 'local-visible', observer.label)
  }
})

test('a lunar eclipse ends one penumbral semi-duration after its peak', () => {
  const events = getSkyEvents({
    start: new Date('2026-08-01T00:00:00Z'),
    end: new Date('2026-08-31T23:59:59Z'),
    language: 'en',
  })
  const lunar = events.find((event) => event.kind === 'lunar-eclipse')
  assert.ok(lunar?.endsAt)
  const hours = (Date.parse(lunar.endsAt) - Date.parse(lunar.startsAt)) / 3_600_000
  // The 2026-08-28 partial eclipse has a penumbral phase of ~5.6 h in total.
  assert.ok(hours > 2.5 && hours < 3.1, `penumbral half-phase was ${hours.toFixed(2)} h`)
})

test('meteor maxima computed from IMO solar longitudes land on the IMO 2026 and 2027 dates', () => {
  const imo: Record<number, Record<string, string>> = {
    2026: {
      quadrantids: '01-03', lyrids: '04-22', 'eta-aquariids': '05-06', 'southern-delta-aquariids': '07-31',
      perseids: '08-13', draconids: '10-09', orionids: '10-21', 'southern-taurids': '11-05',
      'northern-taurids': '11-12', leonids: '11-17', geminids: '12-14', ursids: '12-22',
    },
    2027: {
      quadrantids: '01-04', lyrids: '04-23', 'eta-aquariids': '05-06', 'southern-delta-aquariids': '07-31',
      perseids: '08-13', draconids: '10-09', orionids: '10-22', 'southern-taurids': '11-06',
      'northern-taurids': '11-13', leonids: '11-18', geminids: '12-14', ursids: '12-23',
    },
  }
  for (const [year, dates] of Object.entries(imo)) {
    for (const shower of METEOR_SHOWERS) {
      const apparition = showerApparition(shower, Number(year))
      assert.equal(apparition.peakAt.toISOString().slice(5, 10), dates[shower.id], `${shower.id} ${year}`)
    }
  }
  // IMO 2026 text: Ursids maximum December 22, 22h UT.
  assert.equal(showerApparition(findMeteorShower('ursids'), 2026).peakAt.toISOString().slice(0, 13), '2026-12-22T22')
  const quadrantids = showerApparition(findMeteorShower('quadrantids'), 2027)
  assert.equal(quadrantids.activeStart.toISOString().slice(0, 10), '2026-12-28')
  assert.equal(quadrantids.activeEnd.toISOString().slice(0, 10), '2027-01-12')
})

test('Skywatch lists Moon phases with 2026 supermoons, every opposition, and close planet pairs', () => {
  const events = getSkyEvents({
    start: new Date('2026-01-01T00:00:00Z'),
    end: new Date('2027-01-01T00:00:00Z'),
    language: 'en',
  })
  const supermoons = events.filter((event) => event.title === 'Supermoon').map((event) => event.startsAt.slice(0, 10))
  assert.deepEqual(supermoons, ['2026-01-03', '2026-11-24', '2026-12-24'])
  // 12.4 synodic months a year: 49 or 50 principal phases depending on alignment.
  const phases = events.filter((event) => event.kind === 'moon-phase').length
  assert.ok(phases >= 49 && phases <= 50, `phases ${phases}`)
  const oppositions = events.filter((event) => event.kind === 'opposition').map((event) => `${event.targetBody} ${event.startsAt.slice(0, 10)}`)
  assert.deepEqual(oppositions, [
    'jupiter 2026-01-10',
    'neptune 2026-09-26',
    'saturn 2026-10-04',
    'uranus 2026-11-25',
  ])
  assert.ok(events.some((event) => event.id === 'conjunction-inferior-venus-2026-10-24'))
  const pairs = events.filter((event) => event.kind === 'planet-pair')
  assert.ok(pairs.length > 0)
  for (const pair of pairs) assert.match(pair.summary, /°/)
})

test('meteor visibility follows the radiant: Geminids rise for Istanbul but not for the South Pole', () => {
  const window = { start: new Date('2026-12-13T00:00:00Z'), end: new Date('2026-12-15T00:00:00Z'), language: 'en' as const }
  const geminids = (latitude: number) => getSkyEvents({ ...window, observer: { latitude, longitude: 28.98, label: 'x' } })
    .find((event) => event.id === 'meteor-geminids-2026')
  assert.equal(geminids(41.01)?.visibility, 'local-visible')
  assert.equal(geminids(-89)?.visibility, 'local-not-visible')
})

test('meteor notes separate a sky that never darkens from a radiant that never rises', () => {
  const perseids = (latitude: number) => getSkyEvents({
    start: new Date('2026-08-12T00:00:00Z'),
    end: new Date('2026-08-14T00:00:00Z'),
    observer: { latitude, longitude: 25, label: 'x' },
    language: 'en',
  }).find((event) => event.id === 'meteor-perseids-2026')
  const arctic = perseids(70)
  assert.match(arctic?.summary ?? '', /never gets astronomically dark/)
  assert.doesNotMatch(arctic?.summary ?? '', /below the horizon/)
  assert.equal(arctic?.visibility, 'local-not-visible')
  assert.match(perseids(-45)?.summary ?? '', /below the horizon|reaches only/)
  assert.match(perseids(45)?.summary ?? '', /reaches \d+° in darkness/)
})
