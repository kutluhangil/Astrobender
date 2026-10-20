import { Body, Equator, GeoVector, Horizon, Observer } from 'astronomy-engine'
import * as satellite from 'satellite.js'
import { satrecFromElements, type OmmElements } from './omm.ts'

/**
 * Visible-pass prediction for a ground observer: the satellite clears a
 * minimum elevation, the satellite is sunlit, and the observer's sky is dark.
 *
 * Earth's shadow is modelled as a cylinder of Earth's equatorial radius. The
 * true umbra is a cone, but at low-orbit altitudes the difference shifts entry
 * and exit by a few seconds, below what an observer can tell apart. The Sun
 * direction comes from astronomy-engine in the J2000 frame while SGP4 works in
 * TEME; the ~0.4° gap between them is likewise far below the shadow geometry.
 */

const EARTH_RADIUS_KM = 6378.137
const DEG = 180 / Math.PI

export interface PassObserver {
  latitude: number
  longitude: number
  /** Metres above the ellipsoid. */
  heightM?: number
}

export interface PassPoint {
  at: Date
  elevationDeg: number
  azimuthDeg: number
}

export interface SatellitePass {
  norad: number
  name: string
  rise: PassPoint
  culmination: PassPoint
  set: PassPoint
  /** True when part of the pass is sunlit above a sky darker than civil twilight. */
  visible: boolean
  /** Sunlit-and-dark portion; null when the pass is not visible. */
  visibleFrom: Date | null
  visibleTo: Date | null
}

export interface PassSearchOptions {
  start: Date
  hours: number
  /** Elevation that counts as rise and set. Default 10°. */
  minElevationDeg?: number
  /** Sun altitude below which the observer's sky counts as dark. Default −6° (civil dusk). */
  maxSunAltitudeDeg?: number
}

function lookAngles(
  record: satellite.SatRec,
  observerGd: satellite.GeodeticLocation,
  when: Date,
): { elevationDeg: number; azimuthDeg: number; positionEci: satellite.EciVec3<number> } | null {
  const state = satellite.propagate(record, when)
  const position = state?.position
  if (!position || typeof position === 'boolean' || !Number.isFinite(position.x)) return null
  const ecf = satellite.eciToEcf(position, satellite.gstime(when))
  const angles = satellite.ecfToLookAngles(observerGd, ecf)
  return {
    elevationDeg: angles.elevation * DEG,
    azimuthDeg: ((angles.azimuth * DEG) % 360 + 360) % 360,
    positionEci: position,
  }
}

type UnitVector = { x: number; y: number; z: number }

function sunDirection(when: Date): UnitVector {
  const sun = GeoVector(Body.Sun, when, true)
  const length = Math.hypot(sun.x, sun.y, sun.z)
  return { x: sun.x / length, y: sun.y / length, z: sun.z / length }
}

/** Cylindrical-shadow test: false when the satellite is behind Earth relative to the Sun. */
export function isSunlit(positionEciKm: { x: number; y: number; z: number }, when: Date): boolean {
  return isSunlitAlong(positionEciKm, sunDirection(when))
}

function isSunlitAlong(positionEciKm: { x: number; y: number; z: number }, sun: UnitVector): boolean {
  const ux = sun.x
  const uy = sun.y
  const uz = sun.z
  const along = positionEciKm.x * ux + positionEciKm.y * uy + positionEciKm.z * uz
  if (along >= 0) return true
  const perpendicular = Math.hypot(
    positionEciKm.x - along * ux,
    positionEciKm.y - along * uy,
    positionEciKm.z - along * uz,
  )
  return perpendicular > EARTH_RADIUS_KM
}

function sunAltitudeDeg(observer: Observer, when: Date): number {
  const equator = Equator(Body.Sun, when, observer, true, true)
  return Horizon(when, observer, equator.ra, equator.dec, 'normal').altitude
}

/** Instant within (low, high] where elevation crosses `threshold`, to one second. */
function refineCrossing(
  record: satellite.SatRec,
  observerGd: satellite.GeodeticLocation,
  lowMs: number,
  highMs: number,
  threshold: number,
  rising: boolean,
): number {
  let low = lowMs
  let high = highMs
  while (high - low > 1000) {
    const middle = (low + high) / 2
    const angles = lookAngles(record, observerGd, new Date(middle))
    const above = angles !== null && angles.elevationDeg >= threshold
    if (above === rising) high = middle
    else low = middle
  }
  return high
}

export function predictPasses(elements: OmmElements, observer: PassObserver, options: PassSearchOptions): SatellitePass[] {
  if (!Number.isFinite(observer.latitude) || Math.abs(observer.latitude) > 90) {
    throw new Error(`Pass prediction needs a latitude in [-90, 90]; received ${observer.latitude}`)
  }
  if (!Number.isFinite(observer.longitude) || Math.abs(observer.longitude) > 180) {
    throw new Error(`Pass prediction needs a longitude in [-180, 180]; received ${observer.longitude}`)
  }
  if (!(options.hours > 0)) throw new Error(`Pass search window must be positive; received ${options.hours} h`)
  const minElevation = options.minElevationDeg ?? 10
  const maxSunAltitude = options.maxSunAltitudeDeg ?? -6
  const record = satrecFromElements(elements)
  if (record.error !== satellite.SatRecError.None) {
    throw new Error(`SGP4 could not initialise NORAD ${elements.norad} (${elements.name}): error ${record.error}`)
  }
  const observerGd: satellite.GeodeticLocation = {
    latitude: satellite.degreesToRadians(observer.latitude),
    longitude: satellite.degreesToRadians(observer.longitude),
    height: (observer.heightM ?? 0) / 1000,
  }
  const skyObserver = new Observer(observer.latitude, observer.longitude, observer.heightM ?? 0)

  // A 30 s scan cannot step over a low-orbit pass above 10°, which lasts minutes.
  const stepMs = 30_000
  const startMs = options.start.getTime()
  const endMs = startMs + options.hours * 3_600_000
  const passes: SatellitePass[] = []
  let previousAbove: boolean | null = null
  let riseMs: number | null = null

  for (let ms = startMs; ms <= endMs + stepMs; ms += stepMs) {
    const angles = lookAngles(record, observerGd, new Date(ms))
    const above = angles !== null && angles.elevationDeg >= minElevation
    if (previousAbove === null) {
      if (above) riseMs = ms
    } else if (above && !previousAbove) {
      riseMs = refineCrossing(record, observerGd, ms - stepMs, ms, minElevation, true)
    } else if (!above && previousAbove && riseMs !== null) {
      const setMs = refineCrossing(record, observerGd, ms - stepMs, ms, minElevation, false)
      const pass = describePass(record, observerGd, skyObserver, elements, riseMs, setMs, maxSunAltitude)
      if (pass) passes.push(pass)
      riseMs = null
    }
    previousAbove = above
    if (ms > endMs && !above) break
  }
  return passes
}

function describePass(
  record: satellite.SatRec,
  observerGd: satellite.GeodeticLocation,
  skyObserver: Observer,
  elements: OmmElements,
  riseMs: number,
  setMs: number,
  maxSunAltitude: number,
): SatellitePass | null {
  const point = (ms: number): PassPoint | null => {
    const angles = lookAngles(record, observerGd, new Date(ms))
    return angles ? { at: new Date(ms), elevationDeg: angles.elevationDeg, azimuthDeg: angles.azimuthDeg } : null
  }
  const rise = point(riseMs)
  const set = point(setMs)
  if (!rise || !set) return null
  let culmination = rise
  let visibleFrom: Date | null = null
  let visibleTo: Date | null = null
  // A low-orbit pass lasts minutes: the Sun moves well under 3° in altitude and
  // a fraction of a degree in direction, so both are evaluated at the ends of
  // the pass and interpolated instead of re-running the ephemeris every sample.
  const sunAtRise = sunAltitudeDeg(skyObserver, new Date(riseMs))
  const sunAtSet = sunAltitudeDeg(skyObserver, new Date(setMs))
  const skyCanBeDark = Math.min(sunAtRise, sunAtSet) <= maxSunAltitude
  const sun = sunDirection(new Date((riseMs + setMs) / 2))
  const spanMs = Math.max(1, setMs - riseMs)
  for (let ms = riseMs; ms <= setMs; ms += 10_000) {
    const angles = lookAngles(record, observerGd, new Date(ms))
    if (!angles) continue
    if (angles.elevationDeg > culmination.elevationDeg) {
      culmination = { at: new Date(ms), elevationDeg: angles.elevationDeg, azimuthDeg: angles.azimuthDeg }
    }
    if (!skyCanBeDark) continue
    const when = new Date(ms)
    const sunAltitude = sunAtRise + ((sunAtSet - sunAtRise) * (ms - riseMs)) / spanMs
    if (sunAltitude <= maxSunAltitude && isSunlitAlong(angles.positionEci, sun)) {
      visibleFrom ??= when
      visibleTo = when
    }
  }
  return {
    norad: elements.norad,
    name: elements.name,
    rise,
    culmination,
    set,
    visible: visibleFrom !== null,
    visibleFrom,
    visibleTo,
  }
}

const COMPASS_TR = ['K', 'KKD', 'KD', 'DKD', 'D', 'DGD', 'GD', 'GGD', 'G', 'GGB', 'GB', 'BGB', 'B', 'BKB', 'KB', 'KKB']
const COMPASS_EN = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

export function compassPoint(azimuthDeg: number, language: 'tr' | 'en'): string {
  const index = Math.round((((azimuthDeg % 360) + 360) % 360) / 22.5) % 16
  return (language === 'tr' ? COMPASS_TR : COMPASS_EN)[index]
}
