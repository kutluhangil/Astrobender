import assert from 'node:assert/strict'
import test from 'node:test'
import * as satellite from 'satellite.js'
import {
  decodeTleCatalogNumber,
  ommEpochMs,
  ommFromTle,
  ommFromTleText,
  parseCsvRows,
  parseOmmCsv,
  satrecFromElements,
  serializeOmmCsv,
} from '../src/lib/omm.ts'

const ISS_NAME = 'ISS (ZARYA)'
const ISS_L1 = '1 25544U 98067A   26199.26509818  .00016717  00000-0  10270-3 0  9005'
const ISS_L2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537'

test('CSV rows honour quotes, doubled quotes, CRLF and embedded line breaks', () => {
  assert.deepEqual(parseCsvRows('A,B\r\n"x, y","say ""hi"""\n"two\nlines",\n'), [
    ['A', 'B'],
    ['x, y', 'say "hi"'],
    ['two\nlines', ''],
  ])
  assert.throws(() => parseCsvRows('A\n"open'), /inside a quoted field/)
})

test('Alpha-5 catalog fields decode past 99999 and skip I and O', () => {
  assert.equal(decodeTleCatalogNumber('25544'), 25544)
  assert.equal(decodeTleCatalogNumber('A0000'), 100000)
  assert.equal(decodeTleCatalogNumber('H9999'), 179999)
  assert.equal(decodeTleCatalogNumber('J0000'), 180000)
  assert.equal(decodeTleCatalogNumber('Z9999'), 339999)
  assert.ok(Number.isNaN(decodeTleCatalogNumber('I0000')))
})

test('OMM epochs keep microseconds and accept an optional Z', () => {
  const base = Date.UTC(2026, 6, 18, 6, 21, 44)
  assert.equal(ommEpochMs('2026-07-18T06:21:44.482752'), base + 482.752)
  assert.equal(ommEpochMs('2026-07-18T06:21:44Z'), base)
  assert.ok(Number.isNaN(ommEpochMs('18 July 2026')))
})

test('TLE conversion reproduces the TLE fields and SGP4 position', () => {
  const omm = ommFromTle(ISS_NAME, ISS_L1, ISS_L2)
  assert.equal(omm.norad, 25544)
  assert.equal(omm.objectId, '1998-067A')
  assert.equal(omm.epoch.slice(0, 19), '2026-07-18T06:21:44')
  assert.equal(omm.eccentricity, 0.0006703)
  assert.equal(omm.bstar, 0.0001027)
  assert.equal(omm.meanMotionDot, 0.00016717)
  assert.equal(omm.meanMotionDdot, 0)
  assert.equal(omm.meanMotion, 15.72125391)

  const when = new Date('2026-07-19T00:00:00Z')
  const fromTle = satellite.propagate(satellite.twoline2satrec(ISS_L1, ISS_L2), when)?.position
  const fromOmm = satellite.propagate(satrecFromElements(omm), when)?.position
  assert.ok(fromTle && fromOmm && typeof fromTle !== 'boolean' && typeof fromOmm !== 'boolean')
  const errorKm = Math.hypot(fromTle.x - fromOmm.x, fromTle.y - fromOmm.y, fromTle.z - fromOmm.z)
  assert.ok(errorKm < 0.01, `OMM and TLE propagation differ by ${errorKm} km`)
})

test('compact CSV round-trips every record exactly', () => {
  const records = ommFromTleText(`${ISS_NAME}\n${ISS_L1}\n${ISS_L2}\n`)
  records.push({ ...records[0], name: 'A "quoted", name', norad: 100123 })
  const parsed = parseOmmCsv(serializeOmmCsv(records))
  assert.equal(parsed.skipped, 0)
  assert.deepEqual(parsed.records, records)
})

test('OMM parsing rejects a header without SGP4 columns and counts bad rows', () => {
  assert.throws(() => parseOmmCsv('OBJECT_NAME,NORAD_CAT_ID\nISS,25544\n'), /missing EPOCH, MEAN_MOTION/)
  const header = 'OBJECT_NAME,NORAD_CAT_ID,EPOCH,MEAN_MOTION,ECCENTRICITY,INCLINATION,RA_OF_ASC_NODE,ARG_OF_PERICENTER,MEAN_ANOMALY,BSTAR,MEAN_MOTION_DOT,MEAN_MOTION_DDOT'
  const parsed = parseOmmCsv(
    `${header}\nGOOD,1,2026-01-01T00:00:00,15,0.001,51,1,2,3,0.0001,0,0\nBAD,2,2026-01-01T00:00:00,abc,0.001,51,1,2,3,0.0001,0,0\n`,
  )
  assert.equal(parsed.records.length, 1)
  assert.equal(parsed.skipped, 1)
  assert.equal(parsed.records[0].objectId, '')
})
