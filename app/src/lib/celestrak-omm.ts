import type { OMMJsonObject } from 'satellite.js'

export type CelestrakGroupKey =
  | 'stations'
  | 'gps'
  | 'glonass'
  | 'galileo'
  | 'weather'
  | 'oneweb'
  | 'starlink'
  | 'brightest'
  | 'debris-cosmos'
  | 'debris-iridium'
  | 'debris-fengyun'
  | 'other'

export interface CelestrakFeedMetadata {
  feed: string
  upstreamGroup: string | null
  groupKey: CelestrakGroupKey
  sourceUrl: string
}

export interface NormalizedOmmRecord {
  name: string
  norad: number
  epochMs: number
  groupKey: CelestrakGroupKey
  feed: string
  omm: OMMJsonObject
}

const CELESTRAK_GP_URL = 'https://celestrak.org/NORAD/elements/gp.php'

const FEED_METADATA: Readonly<Record<string, CelestrakFeedMetadata>> = Object.freeze({
  active: { feed: 'active', upstreamGroup: 'active', groupKey: 'other', sourceUrl: CELESTRAK_GP_URL },
  visual: { feed: 'visual', upstreamGroup: 'visual', groupKey: 'brightest', sourceUrl: CELESTRAK_GP_URL },
  cosmos2251: { feed: 'cosmos2251', upstreamGroup: 'cosmos-2251-debris', groupKey: 'debris-cosmos', sourceUrl: CELESTRAK_GP_URL },
  iridium33: { feed: 'iridium33', upstreamGroup: 'iridium-33-debris', groupKey: 'debris-iridium', sourceUrl: CELESTRAK_GP_URL },
  fengyun1c: { feed: 'fengyun1c', upstreamGroup: 'fengyun-1c-debris', groupKey: 'debris-fengyun', sourceUrl: CELESTRAK_GP_URL },
})

const UNKNOWN_FEED_METADATA: CelestrakFeedMetadata = Object.freeze({
  feed: 'unknown',
  upstreamGroup: null,
  groupKey: 'other',
  sourceUrl: CELESTRAK_GP_URL,
})

const REQUIRED_HEADERS = [
  'OBJECT_NAME',
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
  'BSTAR',
  'MEAN_MOTION_DOT',
  'MEAN_MOTION_DDOT',
] as const

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          value += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        value += character
      }
      continue
    }
    if (character === '"') {
      if (value.length !== 0) throw new Error(`Invalid OMM CSV quote at character ${index}`)
      quoted = true
    } else if (character === ',') {
      row.push(value)
      value = ''
    } else if (character === '\n') {
      row.push(value.replace(/\r$/, ''))
      if (row.some((cell) => cell.length > 0)) rows.push(row)
      row = []
      value = ''
    } else {
      value += character
    }
  }
  if (quoted) throw new Error('Invalid OMM CSV: unclosed quoted field')
  row.push(value.replace(/\r$/, ''))
  if (row.some((cell) => cell.length > 0)) rows.push(row)
  return rows
}

function parseEpoch(value: string, rowIndex: number): { value: string; epochMs: number } {
  const source = value.trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(?:Z)?$/.exec(source)
  if (!match) throw new Error(`Invalid EPOCH at OMM CSV row ${rowIndex}: ${source || 'empty'}`)
  const normalized = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.${(match[7] ?? '').padEnd(3, '0').slice(0, 3)}Z`
  const epochMs = Date.parse(normalized)
  const parsed = new Date(epochMs)
  if (
    !Number.isFinite(epochMs)
    || parsed.getUTCFullYear() !== Number(match[1])
    || parsed.getUTCMonth() + 1 !== Number(match[2])
    || parsed.getUTCDate() !== Number(match[3])
    || parsed.getUTCHours() !== Number(match[4])
    || parsed.getUTCMinutes() !== Number(match[5])
    || parsed.getUTCSeconds() !== Number(match[6])
  ) {
    throw new Error(`Invalid EPOCH at OMM CSV row ${rowIndex}: ${source}`)
  }
  return { value: normalized, epochMs }
}

function requireNumber(record: Record<string, string>, header: string, rowIndex: number): number {
  const raw = record[header]?.trim()
  const value = Number(raw)
  if (!raw || !Number.isFinite(value)) throw new Error(`Invalid ${header} at OMM CSV row ${rowIndex}: ${raw || 'empty'}`)
  return value
}

function requireNorad(record: Record<string, string>, rowIndex: number): number {
  const raw = record.NORAD_CAT_ID?.trim()
  if (!raw || !/^\d{1,9}$/.test(raw)) throw new Error(`Invalid NORAD_CAT_ID at OMM CSV row ${rowIndex}: ${raw || 'empty'}`)
  const norad = Number(raw)
  if (!Number.isSafeInteger(norad) || norad < 1) throw new Error(`Invalid NORAD_CAT_ID at OMM CSV row ${rowIndex}: ${raw}`)
  return norad
}

function requireSgp4EphemerisType(record: Record<string, string>, rowIndex: number): 0 {
  const value = record.EPHEMERIS_TYPE?.trim()
  if (value !== '0') {
    throw new Error(`Unsupported EPHEMERIS_TYPE at OMM CSV row ${rowIndex}: SGP4 requires 0; received ${value || 'empty'}`)
  }
  return 0
}

function requireClassification(record: Record<string, string>, rowIndex: number): 'U' | 'C' {
  const value = record.CLASSIFICATION_TYPE?.trim()
  if (value !== 'U' && value !== 'C') {
    throw new Error(`Unsupported CLASSIFICATION_TYPE at OMM CSV row ${rowIndex}: satellite.js SGP4 accepts U or C; received ${value || 'empty'}`)
  }
  return value
}

export function getCelestrakFeedMetadata(feed: string): CelestrakFeedMetadata {
  return FEED_METADATA[feed] ?? { ...UNKNOWN_FEED_METADATA, feed }
}

export function parseCelestrakOmmCsv(text: string, metadata: CelestrakFeedMetadata): NormalizedOmmRecord[] {
  if (!text.trim()) throw new Error(`CelesTrak ${metadata.feed} returned an empty OMM CSV payload`)
  const rows = parseCsvRows(text)
  if (rows.length < 2) throw new Error(`CelesTrak ${metadata.feed} returned no OMM CSV records`)
  const headers = rows[0].map((header, index) => (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim())
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header))
  if (missing.length > 0) throw new Error(`Missing required OMM CSV headers: ${missing.join(', ')}`)
  if (new Set(headers).size !== headers.length) throw new Error('OMM CSV headers must be unique')

  const records: NormalizedOmmRecord[] = []
  const seenNorad = new Set<number>()
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index]
    if (row.length !== headers.length) throw new Error(`OMM CSV row ${index + 1} has ${row.length} fields; expected ${headers.length}`)
    const values = Object.fromEntries(headers.map((header, column) => [header, row[column]])) as Record<string, string>
    const norad = requireNorad(values, index + 1)
    if (seenNorad.has(norad)) throw new Error(`Duplicate NORAD_CAT_ID in OMM CSV: ${norad}`)
    seenNorad.add(norad)
    const epoch = parseEpoch(values.EPOCH, index + 1)
    const meanMotion = requireNumber(values, 'MEAN_MOTION', index + 1)
    const eccentricity = requireNumber(values, 'ECCENTRICITY', index + 1)
    if (meanMotion <= 0) throw new Error(`Invalid MEAN_MOTION at OMM CSV row ${index + 1}: must be greater than zero`)
    if (eccentricity < 0 || eccentricity >= 1) throw new Error(`Invalid ECCENTRICITY at OMM CSV row ${index + 1}: must be within [0, 1)`)

    const omm: OMMJsonObject = {
      OBJECT_NAME: values.OBJECT_NAME.trim(),
      OBJECT_ID: values.OBJECT_ID?.trim() ?? '',
      EPOCH: epoch.value.slice(0, -1),
      MEAN_MOTION: meanMotion,
      ECCENTRICITY: eccentricity,
      INCLINATION: requireNumber(values, 'INCLINATION', index + 1),
      RA_OF_ASC_NODE: requireNumber(values, 'RA_OF_ASC_NODE', index + 1),
      ARG_OF_PERICENTER: requireNumber(values, 'ARG_OF_PERICENTER', index + 1),
      MEAN_ANOMALY: requireNumber(values, 'MEAN_ANOMALY', index + 1),
      EPHEMERIS_TYPE: requireSgp4EphemerisType(values, index + 1),
      CLASSIFICATION_TYPE: requireClassification(values, index + 1),
      NORAD_CAT_ID: norad,
      ELEMENT_SET_NO: Number(values.ELEMENT_SET_NO?.trim() || 0),
      REV_AT_EPOCH: Number(values.REV_AT_EPOCH?.trim() || 0),
      BSTAR: requireNumber(values, 'BSTAR', index + 1),
      MEAN_MOTION_DOT: requireNumber(values, 'MEAN_MOTION_DOT', index + 1),
      MEAN_MOTION_DDOT: requireNumber(values, 'MEAN_MOTION_DDOT', index + 1),
    }
    records.push({
      name: omm.OBJECT_NAME || `NORAD ${norad}`,
      norad,
      epochMs: epoch.epochMs,
      groupKey: metadata.groupKey,
      feed: metadata.feed,
      omm,
    })
  }
  return records
}

/** Returns the checksum-free OMM shape consumed directly by satellite.js json2satrec. */
export function normalizeOmmForSgp4(record: NormalizedOmmRecord): OMMJsonObject {
  return record.omm
}
