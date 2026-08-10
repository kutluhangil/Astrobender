import assert from 'node:assert/strict'
import test from 'node:test'
import { getSkyEvents } from '../src/lib/sky-events.ts'

test('Skywatch includes NASA-verified August 2026 eclipses in chronological order', () => {
  const events = getSkyEvents({
    start: new Date('2026-08-01T00:00:00Z'),
    end: new Date('2026-08-31T23:59:59Z'),
    language: 'tr',
  })

  assert.ok(events.some((event) => event.kind === 'solar-eclipse' && event.startsAt.startsWith('2026-08-12')))
  assert.ok(events.some((event) => event.kind === 'lunar-eclipse' && event.startsAt.startsWith('2026-08-28')))
  assert.ok(events.some((event) => event.kind === 'meteor-shower' && /Perseid/i.test(event.title)))
  assert.deepEqual(
    [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map((event) => event.id),
    events.map((event) => event.id),
  )
  assert.ok(events.every((event) => event.sourceUrl.startsWith('https://')))
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
