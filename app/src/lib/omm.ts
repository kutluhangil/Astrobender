// CCSDS Orbit Mean-Elements Messages (OMM) as CelesTrak serves them in CSV.
//
// The TLE format stores the catalog number in five characters, and the US
// Space Force catalog passed 99999 on 2026-07-11. CelesTrak's TLE output
// therefore omits every newer object, while its OMM formats carry the full
// number. Rows are read by header name, never by column position, so a
// reordered or extended CelesTrak header cannot shift a value into the wrong
// field.

import * as satellite from 'satellite.js'

export interface OmmElements {
  name: string
  norad: number
  /** International designator, e.g. "1998-067A"; empty when the source omits it. */
  objectId: string
  /** UTC epoch exactly as published, without a zone suffix ("2026-07-18T06:21:44.482752"). */
  epoch: string
  /** `epoch` as ms since the Unix epoch. */
  epochMs: number
  /** Revolutions per day. */
  meanMotion: number
  eccentricity: number
  /** Degrees. */
  inclination: number
  /** Degrees. */
  raOfAscNode: number
  /** Degrees. */
  argOfPericenter: number
  /** Degrees. */
  meanAnomaly: number
  /** Inverse Earth radii. */
  bstar: number
  /** Revolutions per day squared, divided by two (TLE convention). */
  meanMotionDot: number
  /** Revolutions per day cubed, divided by six (TLE convention). */
  meanMotionDdot: number
}

/** Columns the compact Astrobender CSV carries, in output order. */
export const OMM_CSV_COLUMNS = [
  'OBJECT_NAME',
  'OBJECT_ID',
  'NORAD_CAT_ID',
  'EPOCH',
  'MEAN_MOTION',
  'ECCENTRICITY',
  'INCLINATION',
  'RA_OF_ASC_NODE',
  'ARG_OF_PERICENTER',
  'MEAN_ANOMALY',
  'BSTAR',
  'MEAN_MOTION_DOT',
  'MEAN_MOTION_DDOT',
] as const

/** Columns without which SGP4 cannot be initialised. OBJECT_ID is optional. */
export const OMM_REQUIRED_COLUMNS = OMM_CSV_COLUMNS.filter((column) => column !== 'OBJECT_ID')

/** RFC 4180 rows: quoted fields may hold commas, doubled quotes and line breaks. */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let fieldStarted = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index++
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"' && !fieldStarted) {
      quoted = true
      fieldStarted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
      fieldStarted = false
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++
      row.push(field)
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
      field = ''
      fieldStarted = false
    } else {
      field += char
      fieldStarted = true
    }
  }
  if (quoted) throw new Error('OMM CSV ends inside a quoted field')
  if (fieldStarted || row.length > 0) {
    row.push(field)
    if (row.length > 1 || row[0] !== '') rows.push(row)
  }
  return rows
}

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/** Parses an OMM epoch; CelesTrak publishes UTC without a zone suffix. */
export function ommEpochMs(epoch: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z?$/.exec(epoch.trim())
  if (!match) return Number.NaN
  const fraction = match[7] ? Number(`0.${match[7]}`) : 0
  return (
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6]),
    ) + fraction * 1000
  )
}

export interface OmmParseResult {
  records: OmmElements[]
  /** Data rows dropped because a required value was missing or not a finite number. */
  skipped: number
}

/** Throws when the header lacks a required column; skips malformed rows and counts them. */
export function parseOmmCsv(text: string): OmmParseResult {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''))
  if (rows.length === 0) throw new Error('OMM CSV is empty')
  const header = rows[0].map((column) => column.trim().toUpperCase())
  const missing = OMM_REQUIRED_COLUMNS.filter((column) => !header.includes(column))
  if (missing.length > 0) {
    throw new Error(
      `OMM CSV header is missing ${missing.join(', ')}; received "${rows[0].join(',').slice(0, 180)}"`,
    )
  }
  const at = Object.fromEntries(header.map((column, index) => [column, index])) as Record<string, number>
  const records: OmmElements[] = []
  let skipped = 0
  for (const row of rows.slice(1)) {
    const value = (column: string) => (row[at[column]] ?? '').trim()
    const number = (column: string) => {
      const raw = value(column)
      return raw === '' ? Number.NaN : Number(raw)
    }
    const epoch = value('EPOCH')
    const record: OmmElements = {
      name: value('OBJECT_NAME').replace(/\s+/g, ' '),
      norad: number('NORAD_CAT_ID'),
      objectId: at.OBJECT_ID === undefined ? '' : value('OBJECT_ID'),
      epoch,
      epochMs: ommEpochMs(epoch),
      meanMotion: number('MEAN_MOTION'),
      eccentricity: number('ECCENTRICITY'),
      inclination: number('INCLINATION'),
      raOfAscNode: number('RA_OF_ASC_NODE'),
      argOfPericenter: number('ARG_OF_PERICENTER'),
      meanAnomaly: number('MEAN_ANOMALY'),
      bstar: number('BSTAR'),
      meanMotionDot: number('MEAN_MOTION_DOT'),
      meanMotionDdot: number('MEAN_MOTION_DDOT'),
    }
    const numeric = [
      record.epochMs,
      record.meanMotion,
      record.eccentricity,
      record.inclination,
      record.raOfAscNode,
      record.argOfPericenter,
      record.meanAnomaly,
      record.bstar,
      record.meanMotionDot,
      record.meanMotionDdot,
    ]
    if (
      !Number.isSafeInteger(record.norad) ||
      record.norad <= 0 ||
      record.meanMotion <= 0 ||
      !numeric.every(Number.isFinite)
    ) {
      skipped++
      continue
    }
    if (!record.name) record.name = `NORAD ${record.norad}`
    records.push(record)
  }
  return { records, skipped }
}

/** The compact CSV the proxy and the bundled snapshots share. */
export function serializeOmmCsv(records: readonly OmmElements[]): string {
  const lines = [OMM_CSV_COLUMNS.join(',')]
  for (const record of records) {
    lines.push(
      [
        csvField(record.name),
        csvField(record.objectId),
        String(record.norad),
        record.epoch,
        String(record.meanMotion),
        String(record.eccentricity),
        String(record.inclination),
        String(record.raOfAscNode),
        String(record.argOfPericenter),
        String(record.meanAnomaly),
        String(record.bstar),
        String(record.meanMotionDot),
        String(record.meanMotionDdot),
      ].join(','),
    )
  }
  return `${lines.join('\n')}\n`
}

export function satrecFromElements(elements: OmmElements): satellite.SatRec {
  return satellite.json2satrec({
    OBJECT_NAME: elements.name,
    OBJECT_ID: elements.objectId,
    // satellite.js reads EPOCH with `new Date(EPOCH + 'Z')`, which keeps only
    // milliseconds anyway; handing it exactly three fractional digits avoids
    // engines that reject CelesTrak's six-digit fraction.
    EPOCH: new Date(Math.round(elements.epochMs)).toISOString().slice(0, 23),
    MEAN_MOTION: elements.meanMotion,
    ECCENTRICITY: elements.eccentricity,
    INCLINATION: elements.inclination,
    RA_OF_ASC_NODE: elements.raOfAscNode,
    ARG_OF_PERICENTER: elements.argOfPericenter,
    MEAN_ANOMALY: elements.meanAnomaly,
    NORAD_CAT_ID: elements.norad,
    ELEMENT_SET_NO: 0,
    REV_AT_EPOCH: 0,
    BSTAR: elements.bstar,
    MEAN_MOTION_DOT: elements.meanMotionDot,
    MEAN_MOTION_DDOT: elements.meanMotionDdot,
  })
}

// ---- TLE conversion, used by tooling to migrate bundled snapshots ----------

const ALPHA5 = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

/** Five-character TLE catalog field, including Alpha-5 ("A0000" = 100000; I and O skipped). */
export function decodeTleCatalogNumber(field: string): number {
  const trimmed = field.trim()
  const letter = ALPHA5.indexOf(trimmed[0]?.toUpperCase() ?? '')
  if (letter >= 0 && /^\d{4}$/.test(trimmed.slice(1))) {
    return (letter + 10) * 10000 + Number(trimmed.slice(1))
  }
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN
}

/** TLE "assumed decimal point" fields such as " 10270-3" (= 0.10270e-3). */
function tleExponential(field: string): number {
  const match = /^([ +-]?)(\d{5})([+-]\d)$/.exec(field.padStart(8, ' ').slice(-8))
  if (!match) return Number.NaN
  const mantissa = Number(`0.${match[2]}`)
  const value = mantissa * 10 ** Number(match[3])
  return match[1] === '-' ? -value : value
}

function tleEpoch(field: string): { iso: string; ms: number } {
  const yy = Number(field.slice(0, 2))
  const dayOfYear = Number(field.slice(2))
  const year = yy < 57 ? 2000 + yy : 1900 + yy
  // Integer microseconds keep the six-digit fraction exact.
  const totalMicros = Date.UTC(year, 0, 1) * 1000 + Math.round((dayOfYear - 1) * 86_400_000_000)
  const wholeMs = Math.floor(totalMicros / 1000)
  const micros = totalMicros - wholeMs * 1000
  const iso = `${new Date(wholeMs).toISOString().slice(0, 23)}${String(micros).padStart(3, '0')}`
  return { iso, ms: ommEpochMs(iso) }
}

function tleObjectId(field: string): string {
  const trimmed = field.trim()
  const match = /^(\d{2})(\d{3})([A-Z]{1,3})$/.exec(trimmed)
  if (!match) return ''
  const year = Number(match[1]) < 57 ? 2000 + Number(match[1]) : 1900 + Number(match[1])
  return `${year}-${match[2]}${match[3]}`
}

export function ommFromTle(name: string, line1: string, line2: string): OmmElements {
  const epoch = tleEpoch(line1.slice(18, 32).trim())
  const record: OmmElements = {
    name: name.trim().replace(/\s+/g, ' '),
    norad: decodeTleCatalogNumber(line1.slice(2, 7)),
    objectId: tleObjectId(line1.slice(9, 17)),
    epoch: epoch.iso,
    epochMs: epoch.ms,
    meanMotion: Number(line2.slice(52, 63)),
    eccentricity: Number(`0.${line2.slice(26, 33).trim()}`),
    inclination: Number(line2.slice(8, 16)),
    raOfAscNode: Number(line2.slice(17, 25)),
    argOfPericenter: Number(line2.slice(34, 42)),
    meanAnomaly: Number(line2.slice(43, 51)),
    bstar: tleExponential(line1.slice(53, 61)),
    meanMotionDot: Number(line1.slice(33, 43).trim().replace(/^([+-]?)\./, '$10.')),
    meanMotionDdot: tleExponential(line1.slice(44, 52)),
  }
  if (!record.name) record.name = `NORAD ${record.norad}`
  return record
}

/** Parses a three-line TLE text into OMM records, skipping incomplete entries. */
export function ommFromTleText(text: string): OmmElements[] {
  const out: OmmElements[] = []
  let name = ''
  let line1 = ''
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (line.startsWith('1 ') && line.length >= 60) {
      line1 = line
    } else if (line.startsWith('2 ') && line.length >= 60 && line1) {
      out.push(ommFromTle(name, line1, line))
      name = ''
      line1 = ''
    } else if (line.length > 0 && !line.startsWith('#')) {
      name = line
      line1 = ''
    }
  }
  return out
}
