import { validateEvidenceRecord, type EvidenceRecord } from './scientific-evidence.ts'

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

export type EarthSourceId = 'eonet' | 'usgs' | 'aurora'

export interface EarthLayerVisibility {
  eonet: boolean
  usgs: boolean
  aurora: boolean
}

export interface EarthObservatoryCache {
  version: 1
  sources: Partial<{
    eonet: { fetchedAt: number; data: EarthEvent[] }
    usgs: { fetchedAt: number; data: EarthEvent[] }
    aurora: { fetchedAt: number; data: AuroraForecast }
  }>
}

export const EARTH_OBSERVATORY_CACHE_KEY = 'astrobender.earth-observatory.v1'

export const EARTH_DATA_URLS = {
  eonet: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=24',
  usgs: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
  aurora: 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json',
  worldview:
    'https://worldview.earthdata.nasa.gov/?l=VIIRS_SNPP_CorrectedReflectance_TrueColor,Coastlines_15m&lg=true',
  gibs: 'https://data.nasa.gov/dataset/gibs-api-for-developers',
} as const

const EARTH_SOURCE_METADATA: Record<EarthSourceId, { publisher: string; sourceUrl: string }> = {
  eonet: { publisher: 'NASA EONET', sourceUrl: EARTH_DATA_URLS.eonet },
  usgs: { publisher: 'USGS', sourceUrl: EARTH_DATA_URLS.usgs },
  aurora: { publisher: 'NOAA SWPC', sourceUrl: EARTH_DATA_URLS.aurora },
}

export function getEarthSourceEvidence(source: EarthSourceId, retrievedAt: number): EvidenceRecord {
  if (!Number.isFinite(retrievedAt) || retrievedAt <= 0) {
    throw new Error(`Earth source evidence requires a valid retrieval timestamp; received ${retrievedAt}`)
  }
  const metadata = EARTH_SOURCE_METADATA[source]
  return validateEvidenceRecord({
    evidenceClass: 'live',
    publisher: metadata.publisher,
    sourceUrl: metadata.sourceUrl,
    retrievedAt: new Date(retrievedAt).toISOString(),
    verifiedAt: '2026-07-26',
    uncertainty: 'Unknown where the upstream payload does not publish an uncertainty.',
    limitation: 'A failed refresh retains the last valid payload with this original retrieval time.',
  })
}

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
    const lon = Number(coordinate[0])
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
  for (const source of ['eonet', 'usgs', 'aurora'] as const) {
    const cached = payload.sources[source]
    if (cached === undefined) continue
    if (!isRecord(cached) || typeof cached.fetchedAt !== 'number' || !Number.isFinite(cached.fetchedAt)) {
      throw new Error(`Earth Observatory cache has invalid ${source}.fetchedAt`)
    }
    if (source === 'aurora') {
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
