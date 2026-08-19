import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  METEOR_CALENDAR_BY_YEAR,
  validateMeteorCalendar,
} from '../src/lib/meteor-calendar.ts'

test('reviewed IMO 2026 calendar exposes the published Perseid activity and maximum window only for 2026', () => {
  const record = METEOR_CALENDAR_BY_YEAR[2026]?.find((candidate) => candidate.id === 'perseids')
  assert.ok(record)
  assert.equal(record.activeStart, '2026-07-17T00:00:00.000Z')
  assert.equal(record.activeEnd, '2026-08-24T23:59:59.999Z')
  assert.equal(record.maximumStart, '2026-08-13T02:00:00.000Z')
  assert.equal(record.maximumEnd, '2026-08-13T04:00:00.000Z')
  assert.equal(record.reviewedAt, '2026-08-13')
  assert.equal(record.retrievedAt, '2026-08-13T13:14:39.000Z')
  assert.equal(record.sourceUrl, 'https://www.imo.net/files/meteor-shower/cal2026.pdf')
  assert.deepEqual(METEOR_CALENDAR_BY_YEAR[2025] ?? [], [])
  assert.deepEqual(METEOR_CALENDAR_BY_YEAR[2027] ?? [], [])
})

test('meteor calendar validation rejects non-2026 records and invalid maximum windows', () => {
  assert.throws(
    () => validateMeteorCalendar({ schemaVersion: 1, year: 2027, publisher: 'International Meteor Organization', limitation: 'Reviewed static data.', reviewedAt: '2026-08-13', retrievedAt: '2026-08-13T00:00:00.000Z', sourceUrl: 'https://www.imo.net/files/meteor-shower/cal2026.pdf', showers: [] }),
    /only supports year 2026/i,
  )
  assert.throws(
    () => validateMeteorCalendar({
      year: 2026,
      schemaVersion: 1,
      publisher: 'International Meteor Organization',
      limitation: 'Reviewed static data.',
      reviewedAt: '2026-08-13',
      retrievedAt: '2026-08-13T00:00:00.000Z',
      sourceUrl: 'https://www.imo.net/files/meteor-shower/cal2026.pdf',
      showers: [{
        id: 'invalid', name: 'Invalid', nameTr: 'Geçersiz', activeStart: '2026-08-01T00:00:00.000Z', activeEnd: '2026-08-31T00:00:00.000Z', maximumStart: '2026-08-14T00:00:00.000Z', maximumEnd: '2026-08-13T00:00:00.000Z', parentBody: 'Unknown', zhr: 1, northernHemisphere: true, sourceUrl: 'https://www.imo.net/files/meteor-shower/cal2026.pdf', radiant: { rightAscensionHours: 0, declinationDegrees: 0 },
      }],
    }),
    /maximum window/i,
  )
})

test('primary-data refresh is deterministic validation only and never writes tracked source records', () => {
  const sourceFiles = [
    'public/data/horizons-probes.json',
    'public/data/meteor-calendar-2026.json',
  ]
  const before = sourceFiles.map((file) => readFileSync(file, 'utf8'))
  const output = execFileSync(process.execPath, ['scripts/refresh-primary-data.mjs', '--check'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })
  assert.match(output, /Validated primary source records: Horizons=1, IMO=1/i)
  assert.match(output, /No tracked source data was modified; this command never commits/i)
  assert.deepEqual(sourceFiles.map((file) => readFileSync(file, 'utf8')), before)
})
