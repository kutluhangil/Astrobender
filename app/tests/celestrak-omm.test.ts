import assert from 'node:assert/strict'
import test from 'node:test'
import { json2satrec } from 'satellite.js'
import {
  getCelestrakFeedMetadata,
  normalizeOmmForSgp4,
  parseCelestrakOmmCsv,
} from '../src/lib/celestrak-omm.ts'

const OMM_HEADER = [
  'OBJECT_NAME',
  'OBJECT_ID',
  'EPOCH',
  'MEAN_MOTION',
  'ECCENTRICITY',
  'INCLINATION',
  'RA_OF_ASC_NODE',
  'ARG_OF_PERICENTER',
  'MEAN_ANOMALY',
  'EPHEMERIS_TYPE',
  'CLASSIFICATION_TYPE',
  'NORAD_CAT_ID',
  'ELEMENT_SET_NO',
  'REV_AT_EPOCH',
  'BSTAR',
  'MEAN_MOTION_DOT',
  'MEAN_MOTION_DDOT',
].join(',')

function row(overrides: Partial<Record<string, string>> = {}) {
  const record = {
    OBJECT_NAME: 'TEST SAT',
    OBJECT_ID: '2026-001A',
    EPOCH: '2026-08-13T05:00:00.000000',
    MEAN_MOTION: '15.50000000',
    ECCENTRICITY: '0.0001234',
    INCLINATION: '51.6400',
    RA_OF_ASC_NODE: '12.3456',
    ARG_OF_PERICENTER: '45.6789',
    MEAN_ANOMALY: '90.1234',
    EPHEMERIS_TYPE: '0',
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: '25544',
    ELEMENT_SET_NO: '999',
    REV_AT_EPOCH: '54321',
    BSTAR: '0.00012345',
    MEAN_MOTION_DOT: '0.00000123',
    MEAN_MOTION_DDOT: '0',
    ...overrides,
  }
  return OMM_HEADER.split(',').map((header) => record[header as keyof typeof record]).join(',')
}

test('CelesTrak OMM CSV preserves five-digit and nine-digit NORAD catalog numbers for SGP4', () => {
  const records = parseCelestrakOmmCsv([
    OMM_HEADER,
    row(),
    row({ OBJECT_NAME: 'NINE DIGIT SAT', NORAD_CAT_ID: '799512345' }),
  ].join('\n'), getCelestrakFeedMetadata('active'))

  assert.deepEqual(records.map((record) => record.norad), [25544, 799512345])
  assert.deepEqual(records.map((record) => record.groupKey), ['other', 'other'])

  const satrec = json2satrec(normalizeOmmForSgp4(records[1]))
  assert.equal(satrec.satnum, '799512345')
  assert.equal(satrec.error, 0)
})

test('CelesTrak OMM CSV rejects malformed headers and invalid epochs before propagation', () => {
  assert.throws(
    () => parseCelestrakOmmCsv(`OBJECT_NAME,NORAD_CAT_ID\nTEST,25544`, getCelestrakFeedMetadata('active')),
    /missing required OMM CSV headers/i,
  )
  assert.throws(
    () => parseCelestrakOmmCsv(`${OMM_HEADER}\n${row({ EPOCH: 'not-an-epoch' })}`, getCelestrakFeedMetadata('active')),
    /invalid EPOCH/i,
  )
})

test('CelesTrak feed metadata, not satellite names, controls taxonomy and unknown feeds stay other', () => {
  assert.equal(getCelestrakFeedMetadata('visual').groupKey, 'brightest')
  assert.equal(getCelestrakFeedMetadata('cosmos2251').groupKey, 'debris-cosmos')
  assert.equal(getCelestrakFeedMetadata('unreviewed-feed').groupKey, 'other')
})
