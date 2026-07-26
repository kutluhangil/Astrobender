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
}

export const EARTH_DATA_URLS = {
  eonet: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=24',
  usgs: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
  aurora: 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json',
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
  for (const coordinate of payload.coordinates) {
    if (!Array.isArray(coordinate) || coordinate.length < 3) continue
    const lon = Number(coordinate[0])
    const lat = Number(coordinate[1])
    const probability = Number(coordinate[2])
    if (!validCoordinate(lat, lon) || !Number.isFinite(probability)) continue
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
  }
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
