export type EarthEventKind = 'natural-event' | 'earthquake'

export interface EarthEvent {
  id: string
  kind: EarthEventKind
  title: string
  subtitle: string
  lat: number
  lon: number
  magnitude: number | null
  occurredAt: string
  sourceUrl: string
}

export interface AuroraForecast {
  forecastAt: string
  maxProbability: number
  lat: number
  lon: number
  points: AuroraPoint[]
}

export interface AuroraPoint {
  lat: number
  lon: number
  probability: number
}

export type EarthSourceId = 'eonet' | 'usgs' | 'aurora' | 'kp' | 'flares'

export type KpStatus = 'observed' | 'estimated' | 'predicted'

export interface KpReading {
  /** Start of the three-hour interval, UTC ISO. */
  at: string
  kp: number
  status: KpStatus
  /** NOAA geomagnetic storm level (G1–G5) or null below storm level. */
  scale: string | null
}

export interface KpOutlook {
  /** Latest observed or estimated interval. */
  current: KpReading
  /** Highest predicted interval still ahead of `current`; null when none is published. */
  peakForecast: KpReading | null
}

export interface SolarFlare {
  /** GOES class at peak, e.g. "M1.6". */
  classLabel: string
  peakAt: string
  /** 0.1–0.8 nm peak flux, W/m². */
  peakFlux: number
  /** NOAA radio blackout level (R1–R5) or null below M1. */
  radioBlackout: string | null
}

export interface FlareSummary {
  strongest: SolarFlare | null
  latest: SolarFlare | null
  count: number
}

export interface EarthLayerVisibility {
  eonet: boolean
  usgs: boolean
  aurora: boolean
}

/** Sources drawn on the globe; space weather has readouts but no map layer. */
export type EarthLayerId = keyof EarthLayerVisibility

export interface EarthObservatoryCache {
  version: 1
  sources: Partial<{
    eonet: { fetchedAt: number; data: EarthEvent[] }
    usgs: { fetchedAt: number; data: EarthEvent[] }
    aurora: { fetchedAt: number; data: AuroraForecast }
    kp: { fetchedAt: number; data: KpOutlook }
    flares: { fetchedAt: number; data: FlareSummary }
  }>
}

export const EARTH_OBSERVATORY_CACHE_KEY = 'astrobender.earth-observatory.v1'

export const EARTH_DATA_URLS = {
  eonet: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=24',
  usgs: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
  aurora: 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json',
  kp: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json',
  flares: 'https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json',
  kpInfo: 'https://www.swpc.noaa.gov/products/planetary-k-index',
  scalesInfo: 'https://www.swpc.noaa.gov/noaa-scales-explanation',
  worldview:
    'https://worldview.earthdata.nasa.gov/?l=VIIRS_SNPP_CorrectedReflectance_TrueColor,Coastlines_15m&lg=true',
  gibs: 'https://data.nasa.gov/dataset/gibs-api-for-developers',
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validCoordinate(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function parseEonetEvents(payload: unknown): EarthEvent[] {
  if (!isRecord(payload) || !Array.isArray(payload.events)) {
    throw new Error('NASA EONET response is missing an events array')
  }
  const parsed: EarthEvent[] = []
  for (const rawEvent of payload.events) {
    if (!isRecord(rawEvent) || !Array.isArray(rawEvent.geometry) || rawEvent.geometry.length === 0) {
      continue
    }
    const latest = rawEvent.geometry.at(-1)
    if (!isRecord(latest) || !Array.isArray(latest.coordinates)) continue
    const lon = Number(latest.coordinates[0])
    const lat = Number(latest.coordinates[1])
    if (!validCoordinate(lat, lon)) continue
    const category = Array.isArray(rawEvent.categories) ? rawEvent.categories[0] : null
    const subtitle = isRecord(category) ? asString(category.title) : ''
    const id = asString(rawEvent.id)
    const title = asString(rawEvent.title)
    const occurredAt = asString(latest.date)
    const sourceUrl = asString(rawEvent.link)
    if (!id || !title || !occurredAt || !sourceUrl) continue
    parsed.push({
      id: `eonet-${id}`,
      kind: 'natural-event',
      title,
      subtitle: subtitle || 'Natural Event',
      lat,
      lon,
      magnitude: null,
      occurredAt,
      sourceUrl,
    })
  }
  return parsed
}

export function parseUsgsEarthquakes(payload: unknown): EarthEvent[] {
  if (!isRecord(payload) || !Array.isArray(payload.features)) {
    throw new Error('USGS response is missing a features array')
  }
  const parsed: EarthEvent[] = []
  for (const rawFeature of payload.features) {
    if (!isRecord(rawFeature) || !isRecord(rawFeature.properties) || !isRecord(rawFeature.geometry)) {
      continue
    }
    const coordinates = rawFeature.geometry.coordinates
    if (!Array.isArray(coordinates)) continue
    const lon = Number(coordinates[0])
    const lat = Number(coordinates[1])
    if (!validCoordinate(lat, lon)) continue
    const id = asString(rawFeature.id)
    const title = asString(rawFeature.properties.title)
    const sourceUrl = asString(rawFeature.properties.url)
    const time = Number(rawFeature.properties.time)
    const magnitudeValue = rawFeature.properties.mag
    const magnitude = typeof magnitudeValue === 'number' && Number.isFinite(magnitudeValue)
      ? magnitudeValue
      : null
    if (!id || !title || !sourceUrl || !Number.isFinite(time)) continue
    parsed.push({
      id: `usgs-${id}`,
      kind: 'earthquake',
      title,
      subtitle: magnitude === null ? 'USGS Earthquake' : `Magnitude ${magnitude.toFixed(1)}`,
      lat,
      lon,
      magnitude,
      occurredAt: new Date(time).toISOString(),
      sourceUrl,
    })
  }
  return parsed
}

export function parseNoaaAurora(payload: unknown): AuroraForecast {
  if (!isRecord(payload) || !Array.isArray(payload.coordinates)) {
    throw new Error('NOAA SWPC response is missing a coordinates array')
  }
  let strongest: { probability: number; lat: number; lon: number } | null = null
  const points: AuroraPoint[] = []
  for (const coordinate of payload.coordinates) {
    if (!Array.isArray(coordinate) || coordinate.length < 3) continue
    // OVATION publishes longitude on 0..359 east; everything else here is -180..180.
    const rawLon = Number(coordinate[0])
    const lon = rawLon > 180 ? rawLon - 360 : rawLon
    const lat = Number(coordinate[1])
    const probability = Number(coordinate[2])
    if (!validCoordinate(lat, lon) || !Number.isFinite(probability)) continue
    if (probability >= 10) points.push({ lat, lon, probability })
    if (!strongest || probability > strongest.probability) {
      strongest = { probability, lat, lon }
    }
  }
  const forecastAt = asString(payload['Forecast Time'])
  if (!strongest || !forecastAt) {
    throw new Error('NOAA SWPC response contains no valid aurora forecast cells')
  }
  return {
    forecastAt,
    maxProbability: strongest.probability,
    lat: strongest.lat,
    lon: strongest.lon,
    points,
  }
}

/**
 * NOAA G-scale: Kp 5 is G1 up to Kp 9 for G5. Kp is published in thirds and
 * SWPC already counts "5-" (4.67) as G1, so each level starts a third early.
 */
export function geomagneticScale(kp: number): string | null {
  if (!Number.isFinite(kp)) return null
  const level = Math.floor(kp + 1 / 3 + 1e-9) - 4
  return level >= 1 ? `G${Math.min(5, level)}` : null
}

/** NOAA R-scale from GOES 0.1–0.8 nm peak flux: M1 is R1, M5 R2, X1 R3, X10 R4, X20 R5. */
export function radioBlackoutScale(peakFlux: number): string | null {
  if (!Number.isFinite(peakFlux) || peakFlux < 1e-5) return null
  if (peakFlux >= 2e-3) return 'R5'
  if (peakFlux >= 1e-3) return 'R4'
  if (peakFlux >= 1e-4) return 'R3'
  if (peakFlux >= 5e-5) return 'R2'
  return 'R1'
}

function utcIso(value: string): string {
  return /[zZ]$|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`
}

export function parseKpForecast(payload: unknown): KpOutlook {
  if (!Array.isArray(payload)) throw new Error('NOAA SWPC Kp forecast is not an array')
  const readings: KpReading[] = []
  for (const row of payload) {
    if (!isRecord(row)) continue
    const kp = Number(row.kp)
    const status = row.observed
    const at = asString(row.time_tag)
    if (!at || !Number.isFinite(kp) || (status !== 'observed' && status !== 'estimated' && status !== 'predicted')) continue
    const atIso = utcIso(at)
    if (!Number.isFinite(Date.parse(atIso))) continue
    const scale = typeof row.noaa_scale === 'string' && /^G[1-5]$/.test(row.noaa_scale)
      ? row.noaa_scale
      : geomagneticScale(kp)
    readings.push({ at: atIso, kp, status, scale })
  }
  const measured = readings.filter((reading) => reading.status !== 'predicted')
  const current = measured.at(-1)
  if (!current) throw new Error('NOAA SWPC Kp forecast contains no observed or estimated interval')
  const ahead = readings.filter((reading) => reading.status === 'predicted' && reading.at > current.at)
  const peakForecast = ahead.reduce<KpReading | null>(
    (best, reading) => (best === null || reading.kp > best.kp ? reading : best),
    null,
  )
  return { current, peakForecast }
}

export function parseXrayFlares(payload: unknown): FlareSummary {
  if (!Array.isArray(payload)) throw new Error('NOAA SWPC X-ray flare list is not an array')
  const flares: SolarFlare[] = []
  for (const row of payload) {
    if (!isRecord(row)) continue
    const classLabel = asString(row.max_class)
    const peakAt = asString(row.max_time)
    const peakFlux = Number(row.max_xrlong)
    if (!/^[ABCMX]\d+(\.\d+)?$/.test(classLabel) || !Number.isFinite(Date.parse(peakAt)) || !(peakFlux > 0)) continue
    flares.push({ classLabel, peakAt: utcIso(peakAt), peakFlux, radioBlackout: radioBlackoutScale(peakFlux) })
  }
  flares.sort((left, right) => left.peakAt.localeCompare(right.peakAt))
  const strongest = flares.reduce<SolarFlare | null>(
    (best, flare) => (best === null || flare.peakFlux > best.peakFlux ? flare : best),
    null,
  )
  return { strongest, latest: flares.at(-1) ?? null, count: flares.length }
}

function isKpReading(value: unknown): value is KpReading {
  return (
    isRecord(value) &&
    typeof value.at === 'string' &&
    typeof value.kp === 'number' &&
    (value.status === 'observed' || value.status === 'estimated' || value.status === 'predicted') &&
    (value.scale === null || typeof value.scale === 'string')
  )
}

function isKpOutlook(value: unknown): value is KpOutlook {
  return isRecord(value) && isKpReading(value.current) && (value.peakForecast === null || isKpReading(value.peakForecast))
}

function isSolarFlare(value: unknown): value is SolarFlare {
  return (
    isRecord(value) &&
    typeof value.classLabel === 'string' &&
    typeof value.peakAt === 'string' &&
    typeof value.peakFlux === 'number' &&
    (value.radioBlackout === null || typeof value.radioBlackout === 'string')
  )
}

function isFlareSummary(value: unknown): value is FlareSummary {
  return (
    isRecord(value) &&
    typeof value.count === 'number' &&
    (value.strongest === null || isSolarFlare(value.strongest)) &&
    (value.latest === null || isSolarFlare(value.latest))
  )
}

function isEarthEvent(value: unknown): value is EarthEvent {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    (value.kind === 'natural-event' || value.kind === 'earthquake') &&
    typeof value.title === 'string' &&
    typeof value.subtitle === 'string' &&
    typeof value.lat === 'number' &&
    typeof value.lon === 'number' &&
    validCoordinate(value.lat, value.lon) &&
    typeof value.occurredAt === 'string' &&
    typeof value.sourceUrl === 'string'
  )
}

function isAuroraForecast(value: unknown): value is AuroraForecast {
  if (!isRecord(value) || !Array.isArray(value.points)) return false
  return (
    typeof value.forecastAt === 'string' &&
    typeof value.maxProbability === 'number' &&
    typeof value.lat === 'number' &&
    typeof value.lon === 'number' &&
    validCoordinate(value.lat, value.lon) &&
    value.points.every(
      (point) =>
        isRecord(point) &&
        typeof point.lat === 'number' &&
        typeof point.lon === 'number' &&
        typeof point.probability === 'number' &&
        validCoordinate(point.lat, point.lon),
    )
  )
}

export function parseEarthObservatoryCache(serialized: string): EarthObservatoryCache {
  let payload: unknown
  try {
    payload = JSON.parse(serialized)
  } catch (error) {
    throw new Error(
      `Earth Observatory cache contains invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
  if (!isRecord(payload) || payload.version !== 1 || !isRecord(payload.sources)) {
    throw new Error('Earth Observatory cache is missing version 1 source metadata')
  }
  const sources: EarthObservatoryCache['sources'] = {}
  for (const source of ['eonet', 'usgs', 'aurora', 'kp', 'flares'] as const) {
    const cached = payload.sources[source]
    if (cached === undefined) continue
    if (!isRecord(cached) || typeof cached.fetchedAt !== 'number' || !Number.isFinite(cached.fetchedAt)) {
      throw new Error(`Earth Observatory cache has invalid ${source}.fetchedAt`)
    }
    if (source === 'kp') {
      if (!isKpOutlook(cached.data)) throw new Error('Earth Observatory cache has invalid Kp data')
      sources.kp = { fetchedAt: cached.fetchedAt, data: cached.data }
    } else if (source === 'flares') {
      if (!isFlareSummary(cached.data)) throw new Error('Earth Observatory cache has invalid flare data')
      sources.flares = { fetchedAt: cached.fetchedAt, data: cached.data }
    } else if (source === 'aurora') {
      if (!isAuroraForecast(cached.data)) {
        throw new Error('Earth Observatory cache has invalid aurora data')
      }
      sources.aurora = { fetchedAt: cached.fetchedAt, data: cached.data }
    } else {
      if (!Array.isArray(cached.data) || !cached.data.every(isEarthEvent)) {
        throw new Error(`Earth Observatory cache has invalid ${source} event data`)
      }
      if (source === 'eonet') sources.eonet = { fetchedAt: cached.fetchedAt, data: cached.data }
      else sources.usgs = { fetchedAt: cached.fetchedAt, data: cached.data }
    }
  }
  return { version: 1, sources }
}

export async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) {
    const body = (await response.text()).replace(/\s+/g, ' ').slice(0, 180)
    throw new Error(
      `${url} returned HTTP ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`,
    )
  }
  try {
    return await response.json()
  } catch (error) {
    throw new Error(
      `${url} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
