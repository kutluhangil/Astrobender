import assert from 'node:assert/strict'
import test from 'node:test'
import { getSkyEvents } from '../src/lib/sky-events.ts'
import { directionLabel, getPerseidWatch } from '../src/lib/perseid-watch.ts'
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
  assert.equal(perseid?.startsAt, '2026-08-13T02:00:00.000Z')
  assert.equal(perseid?.endsAt, '2026-08-13T04:00:00.000Z')
  assert.notEqual(perseid?.startsAt, '2026-08-13T03:00:00.000Z')
  assert.deepEqual(
    [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map((event) => event.id),
    events.map((event) => event.id),
  )
  assert.ok(events.every((event) => event.sourceUrl.startsWith('https://')))
})

test('Perseid Watch exposes the IMO 2026 window and calculates a local product heuristic', () => {
  const watch = getPerseidWatch(
    new Date('2026-08-13T03:30:00Z'),
    { latitude: 41.0082, longitude: 28.9784, label: 'İstanbul' },
  )

  assert.equal(watch?.status, 'maximum-window')
  assert.equal(watch?.activeStart, '2026-07-17T00:00:00.000Z')
  assert.equal(watch?.activeEnd, '2026-08-24T23:59:59.999Z')
  assert.equal(watch?.maximumStart, '2026-08-13T02:00:00.000Z')
  assert.equal(watch?.maximumEnd, '2026-08-13T04:00:00.000Z')
  assert.equal('peakAt' in (watch ?? {}), false)
  assert.equal(watch?.moonIlluminationPercent, 0)
  assert.equal(watch?.observer?.label, 'İstanbul')
  assert.ok((watch?.observer?.radiantAltitudeDegrees ?? -1) > 0)
  assert.ok((watch?.observer?.productHeuristic ?? -1) >= 0)
  assert.ok((watch?.observer?.productHeuristic ?? 101) <= 100)
  assert.equal(directionLabel(45, 'tr'), 'KD')
  assert.equal(directionLabel(225, 'en'), 'SW')
})

test('Perseid Watch does not present the year-specific 2026 forecast outside 2026', () => {
  assert.equal(getPerseidWatch(new Date('2027-08-13T12:00:00Z')), null)
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
