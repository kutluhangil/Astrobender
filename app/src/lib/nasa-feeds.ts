/**
 * Live NASA / JPL feeds served through `/api/nasa-feed?feed=<id>`. Each parser
 * validates the upstream shape and throws with the failing input, so a changed
 * upstream schema surfaces as an error instead of an empty panel.
 */

export const NASA_FEED_ENDPOINT = '/api/nasa-feed'

export type NasaFeedId =
  | 'donki-flares'
  | 'donki-cme'
  | 'donki-storms'
  | 'sentry'
  | 'scout'
  | 'fireball'
  | 'apod'
  | 'epic'
  | 'voyager-1'
  | 'voyager-2'
  | 'exoplanets-recent'
  | 'exoplanets-count'

export const NASA_FEED_SOURCES = {
  donki: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
  sentry: 'https://cneos.jpl.nasa.gov/sentry/',
  scout: 'https://cneos.jpl.nasa.gov/scout/',
  fireball: 'https://cneos.jpl.nasa.gov/fireballs/',
  apod: 'https://apod.nasa.gov/apod/',
  epic: 'https://epic.gsfc.nasa.gov/',
  horizons: 'https://ssd.jpl.nasa.gov/horizons/',
  exoplanets: 'https://exoplanetarchive.ipac.caltech.edu/',
  eclipses: 'https://eclipse.gsfc.nasa.gov/eclipse.html',
} as const

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown, context: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${context}: expected an object, got ${JSON.stringify(value)?.slice(0, 120)}`)
  }
  return value as JsonRecord
}

function asArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${context}: expected an array, got ${JSON.stringify(value)?.slice(0, 120)}`)
  }
  return value
}

function str(record: JsonRecord, key: string, context: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${context}: missing string "${key}" in ${JSON.stringify(record).slice(0, 160)}`)
  }
  return value
}

function num(record: JsonRecord, key: string, context: string): number {
  const value = record[key]
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(parsed)) {
    throw new Error(`${context}: "${key}" is not a finite number in ${JSON.stringify(record).slice(0, 160)}`)
  }
  return parsed
}

function optionalNum(record: JsonRecord, key: string): number | null {
  const value = record[key]
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function optionalStr(record: JsonRecord, key: string): string | null {
  const value = record[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

// ---------------------------------------------------------------- DONKI

export interface SolarFlare {
  id: string
  beginTime: string
  peakTime: string | null
  classType: string
  sourceLocation: string | null
  link: string | null
}

export function parseSolarFlares(payload: unknown): SolarFlare[] {
  return asArray(payload, 'DONKI FLR')
    .map((row) => {
      const record = asRecord(row, 'DONKI FLR row')
      return {
        id: str(record, 'flrID', 'DONKI FLR row'),
        beginTime: str(record, 'beginTime', 'DONKI FLR row'),
        peakTime: optionalStr(record, 'peakTime'),
        classType: optionalStr(record, 'classType') ?? '—',
        sourceLocation: optionalStr(record, 'sourceLocation'),
        link: optionalStr(record, 'link'),
      }
    })
    .sort((a, b) => b.beginTime.localeCompare(a.beginTime))
}

/** GOES class letter and magnitude → rank, so X1.2 sorts above M9.9. */
export function flareClassRank(classType: string): number {
  const match = /^([ABCMX])(\d+(?:\.\d+)?)$/.exec(classType.trim().toUpperCase())
  if (!match) return -1
  return 'ABCMX'.indexOf(match[1]) * 100 + Number(match[2])
}

export interface CoronalMassEjection {
  id: string
  startTime: string
  sourceLocation: string | null
  speedKmS: number | null
  halfAngleDeg: number | null
  type: string | null
  note: string | null
  link: string | null
}

export function parseCoronalMassEjections(payload: unknown): CoronalMassEjection[] {
  return asArray(payload, 'DONKI CME')
    .map((row) => {
      const record = asRecord(row, 'DONKI CME row')
      const analyses = Array.isArray(record.cmeAnalyses) ? record.cmeAnalyses : []
      const best = analyses
        .map((analysis) => asRecord(analysis, 'DONKI CME analysis'))
        .find((analysis) => analysis.isMostAccurate === true) ??
        (analyses.length > 0 ? asRecord(analyses[0], 'DONKI CME analysis') : null)
      return {
        id: str(record, 'activityID', 'DONKI CME row'),
        startTime: str(record, 'startTime', 'DONKI CME row'),
        sourceLocation: optionalStr(record, 'sourceLocation'),
        speedKmS: best ? optionalNum(best, 'speed') : null,
        halfAngleDeg: best ? optionalNum(best, 'halfAngle') : null,
        type: best ? optionalStr(best, 'type') : null,
        note: optionalStr(record, 'note'),
        link: optionalStr(record, 'link'),
      }
    })
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
}

export interface GeomagneticStorm {
  id: string
  startTime: string
  maxKp: number | null
  link: string | null
}

export function parseGeomagneticStorms(payload: unknown): GeomagneticStorm[] {
  return asArray(payload, 'DONKI GST')
    .map((row) => {
      const record = asRecord(row, 'DONKI GST row')
      const kpRows = Array.isArray(record.allKpIndex) ? record.allKpIndex : []
      const kps = kpRows
        .map((kp) => optionalNum(asRecord(kp, 'DONKI GST Kp'), 'kpIndex'))
        .filter((kp): kp is number => kp !== null)
      return {
        id: str(record, 'gstID', 'DONKI GST row'),
        startTime: str(record, 'startTime', 'DONKI GST row'),
        maxKp: kps.length > 0 ? Math.max(...kps) : null,
        link: optionalStr(record, 'link'),
      }
    })
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
}

/** NOAA G-scale from the planetary Kp index (G1 = Kp 5 … G5 = Kp 9). */
export function stormScale(kp: number | null): string {
  if (kp === null || kp < 5) return '—'
  return `G${Math.min(5, Math.floor(kp) - 4)}`
}

// ---------------------------------------------------------------- Sentry / Scout

export interface SentryObject {
  designation: string
  fullName: string
  impactProbability: number
  palermoCumulative: number
  /** JPL leaves the Torino value null for some objects. */
  torinoMax: number | null
  diameterKm: number | null
  absoluteMagnitude: number | null
  impactCount: number
  yearRange: string
  lastObservation: string | null
}

export interface SentryTable {
  total: number
  objects: SentryObject[]
}

export function parseSentry(payload: unknown, limit = 12): SentryTable {
  const record = asRecord(payload, 'JPL Sentry')
  const rows = asArray(record.data, 'JPL Sentry data')
  const objects = rows.map((row) => {
    const item = asRecord(row, 'JPL Sentry row')
    return {
      designation: str(item, 'des', 'JPL Sentry row'),
      fullName: str(item, 'fullname', 'JPL Sentry row').replace(/[()]/g, '').trim(),
      impactProbability: num(item, 'ip', 'JPL Sentry row'),
      palermoCumulative: num(item, 'ps_cum', 'JPL Sentry row'),
      torinoMax: optionalNum(item, 'ts_max'),
      diameterKm: optionalNum(item, 'diameter'),
      absoluteMagnitude: optionalNum(item, 'h'),
      impactCount: num(item, 'n_imp', 'JPL Sentry row'),
      yearRange: str(item, 'range', 'JPL Sentry row'),
      lastObservation: optionalStr(item, 'last_obs'),
    }
  })
  objects.sort((a, b) => b.palermoCumulative - a.palermoCumulative)
  return { total: Number(record.count) || objects.length, objects: objects.slice(0, limit) }
}

export interface ScoutObject {
  name: string
  neoScore: number
  phaScore: number
  magnitude: number | null
  closestApproachLd: number | null
  velocityKmS: number | null
  observations: number | null
  lastRun: string | null
}

export function parseScout(payload: unknown, limit = 10): ScoutObject[] {
  const record = asRecord(payload, 'JPL Scout')
  return asArray(record.data, 'JPL Scout data')
    .map((row) => {
      const item = asRecord(row, 'JPL Scout row')
      return {
        name: str(item, 'objectName', 'JPL Scout row'),
        neoScore: num(item, 'neoScore', 'JPL Scout row'),
        phaScore: optionalNum(item, 'phaScore') ?? 0,
        magnitude: optionalNum(item, 'Vmag'),
        closestApproachLd: optionalNum(item, 'caDist'),
        velocityKmS: optionalNum(item, 'vInf'),
        observations: optionalNum(item, 'nObs'),
        lastRun: optionalStr(item, 'lastRun'),
      }
    })
    .sort((a, b) => b.neoScore - a.neoScore || b.phaScore - a.phaScore)
    .slice(0, limit)
}

// ---------------------------------------------------------------- Fireballs

export interface Fireball {
  date: string
  impactEnergyKt: number | null
  radiatedEnergy: number | null
  latitude: number | null
  longitude: number | null
  altitudeKm: number | null
  velocityKmS: number | null
}

export function parseFireballs(payload: unknown): Fireball[] {
  const record = asRecord(payload, 'JPL fireballs')
  const fields = asArray(record.fields, 'JPL fireballs fields').map(String)
  const index = (name: string) => {
    const position = fields.indexOf(name)
    if (position < 0) throw new Error(`JPL fireballs: field "${name}" missing from ${fields.join(', ')}`)
    return position
  }
  const at = {
    date: index('date'),
    energy: index('energy'),
    impact: index('impact-e'),
    lat: index('lat'),
    latDir: index('lat-dir'),
    lon: index('lon'),
    lonDir: index('lon-dir'),
    alt: index('alt'),
    vel: index('vel'),
  }
  const read = (row: unknown[], position: number) => {
    const value = row[position]
    if (value === null || value === undefined || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return asArray(record.data, 'JPL fireballs data').map((entry) => {
    const row = asArray(entry, 'JPL fireballs row')
    const date = row[at.date]
    if (typeof date !== 'string') throw new Error(`JPL fireballs: row without date: ${JSON.stringify(row)}`)
    const lat = read(row, at.lat)
    const lon = read(row, at.lon)
    return {
      date,
      impactEnergyKt: read(row, at.impact),
      radiatedEnergy: read(row, at.energy),
      latitude: lat === null ? null : row[at.latDir] === 'S' ? -lat : lat,
      longitude: lon === null ? null : row[at.lonDir] === 'W' ? -lon : lon,
      altitudeKm: read(row, at.alt),
      velocityKmS: read(row, at.vel),
    }
  })
}

// ---------------------------------------------------------------- APOD / EPIC

export interface AstronomyPicture {
  date: string
  title: string
  explanation: string
  mediaType: 'image' | 'video'
  url: string
  hdUrl: string | null
  copyright: string | null
}

export function parseApod(payload: unknown): AstronomyPicture {
  const record = asRecord(payload, 'NASA APOD')
  const mediaType = record.media_type === 'video' ? 'video' : 'image'
  return {
    date: str(record, 'date', 'NASA APOD'),
    title: str(record, 'title', 'NASA APOD'),
    explanation: str(record, 'explanation', 'NASA APOD').replace(/\s+/g, ' ').trim(),
    mediaType,
    url: str(record, 'url', 'NASA APOD'),
    hdUrl: optionalStr(record, 'hdurl'),
    copyright: optionalStr(record, 'copyright')?.replace(/\s+/g, ' ').trim() ?? null,
  }
}

export interface EpicImage {
  identifier: string
  capturedAt: string
  imageUrl: string
  centroidLatitude: number
  centroidLongitude: number
}

export function parseEpic(payload: unknown, limit = 6): EpicImage[] {
  return asArray(payload, 'NASA EPIC')
    .map((row) => {
      const record = asRecord(row, 'NASA EPIC row')
      const date = str(record, 'date', 'NASA EPIC row')
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
      if (!match) throw new Error(`NASA EPIC row has unreadable date "${date}"`)
      const image = str(record, 'image', 'NASA EPIC row')
      const centroid = asRecord(record.centroid_coordinates, 'NASA EPIC centroid')
      return {
        identifier: str(record, 'identifier', 'NASA EPIC row'),
        capturedAt: date,
        imageUrl: `https://epic.gsfc.nasa.gov/archive/natural/${match[1]}/${match[2]}/${match[3]}/jpg/${image}.jpg`,
        centroidLatitude: num(centroid, 'lat', 'NASA EPIC centroid'),
        centroidLongitude: num(centroid, 'lon', 'NASA EPIC centroid'),
      }
    })
    .slice(-limit)
    .reverse()
}

// ---------------------------------------------------------------- Voyager (Horizons)

export interface ProbeRange {
  heliocentricAu: number
  heliocentricSpeedKmS: number
  earthDistanceAu: number
  earthDistanceKm: number
  lightTimeHours: number
  epoch: string
}

const AU_KM = 149_597_870.7
const LIGHT_SPEED_KM_S = 299_792.458

export function parseHorizonsRange(payload: unknown): ProbeRange {
  const record = asRecord(payload, 'JPL Horizons')
  const result = str(record, 'result', 'JPL Horizons')
  const start = result.indexOf('$$SOE')
  const end = result.indexOf('$$EOE')
  if (start < 0 || end < start) {
    throw new Error(`JPL Horizons returned no ephemeris table — ${result.replace(/\s+/g, ' ').slice(0, 180)}`)
  }
  const line = result.slice(start + 5, end).trim().split('\n')[0]?.trim() ?? ''
  const match = /^(\d{4}-[A-Za-z]{3}-\d{2} \d{2}:\d{2})\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/.exec(line)
  if (!match) throw new Error(`JPL Horizons ephemeris row is unreadable: "${line}"`)
  const [heliocentricAu, speed, earthAu] = [Number(match[2]), Number(match[3]), Number(match[4])]
  if (![heliocentricAu, speed, earthAu].every(Number.isFinite)) {
    throw new Error(`JPL Horizons ephemeris row has non-numeric values: "${line}"`)
  }
  const earthDistanceKm = earthAu * AU_KM
  return {
    heliocentricAu,
    heliocentricSpeedKmS: Math.abs(speed),
    earthDistanceAu: earthAu,
    earthDistanceKm,
    lightTimeHours: earthDistanceKm / LIGHT_SPEED_KM_S / 3600,
    epoch: `${match[1].replace(/ /, 'T')}Z`,
  }
}

// ---------------------------------------------------------------- Exoplanets

export interface Exoplanet {
  name: string
  host: string
  discoveryYear: number
  method: string
  radiusEarth: number | null
  periodDays: number | null
  distanceParsec: number | null
  facility: string | null
}

export function parseExoplanets(payload: unknown): Exoplanet[] {
  return asArray(payload, 'Exoplanet Archive').map((row) => {
    const record = asRecord(row, 'Exoplanet Archive row')
    return {
      name: str(record, 'pl_name', 'Exoplanet Archive row'),
      host: str(record, 'hostname', 'Exoplanet Archive row'),
      discoveryYear: num(record, 'disc_year', 'Exoplanet Archive row'),
      method: str(record, 'discoverymethod', 'Exoplanet Archive row'),
      radiusEarth: optionalNum(record, 'pl_rade'),
      periodDays: optionalNum(record, 'pl_orbper'),
      distanceParsec: optionalNum(record, 'sy_dist'),
      facility: optionalStr(record, 'disc_facility'),
    }
  })
}

export function parseExoplanetCount(payload: unknown): number {
  const rows = asArray(payload, 'Exoplanet Archive count')
  const record = asRecord(rows[0], 'Exoplanet Archive count row')
  return num(record, 'confirmed', 'Exoplanet Archive count row')
}

// ---------------------------------------------------------------- Fetch

export async function fetchNasaFeed(feed: NasaFeedId, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`${NASA_FEED_ENDPOINT}?feed=${feed}`, {
    signal,
    headers: { Accept: 'application/json' },
  })
  const text = await response.text()
  if (!response.ok) {
    const body = text.replace(/\s+/g, ' ').slice(0, 220)
    throw new Error(`Feed ${feed} returned HTTP ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`)
  }
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(
      `Feed ${feed} returned invalid JSON: ${error instanceof Error ? error.message : String(error)} — ${text.slice(0, 120)}`,
    )
  }
}
