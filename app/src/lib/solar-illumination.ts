import { Body, Equator, Horizon, Observer, SiderealTime } from 'astronomy-engine'
import type { SkyObserver } from './sky-events.ts'

export const NOAA_SOLAR_CALCULATOR_URL = 'https://gml.noaa.gov/grad/solcalc/'

export interface SolarIllumination {
  /** Latitude and longitude directly under the Sun, in degrees. */
  subsolarLatitude: number
  subsolarLongitude: number
  /** Apparent solar time at the observer, in hours from local midnight. */
  localSolarHours: number
  /** Sun altitude above the observer's horizon, in degrees. */
  sunAltitudeDeg: number
  /** True while the observer stands on the lit side of the terminator. */
  daylight: boolean
}

function normalizeLongitude(degrees: number): number {
  return ((degrees + 540) % 360) - 180
}

function normalizeHours(hours: number): number {
  return ((hours % 24) + 24) % 24
}

/**
 * Where the terminator sits and what the clock reads under it. The scene
 * already draws the sunrise line from the Sun direction; restating the same
 * geometry as a reading is what turns the Earth view into a tool rather than a
 * picture.
 */
export function getSolarIllumination(
  timeMs: number,
  observer: SkyObserver,
): SolarIllumination {
  if (!Number.isFinite(timeMs)) throw new Error(`Invalid illumination time: ${timeMs}`)
  if (!Number.isFinite(observer.latitude) || Math.abs(observer.latitude) > 90) {
    throw new Error(`Observer latitude out of range: ${observer.latitude}`)
  }
  if (!Number.isFinite(observer.longitude) || Math.abs(observer.longitude) > 180) {
    throw new Error(`Observer longitude out of range: ${observer.longitude}`)
  }

  const date = new Date(timeMs)
  const geocentric = Equator(Body.Sun, date, new Observer(0, 0, 0), true, true)
  // Greenwich apparent sidereal time in hours. The sub-solar longitude is the
  // Sun's right ascension measured back from the Greenwich meridian.
  const greenwichSiderealHours = SiderealTime(date)
  const subsolarLongitude = normalizeLongitude(
    (geocentric.ra - greenwichSiderealHours) * 15,
  )

  // Apparent solar time: noon on the meridian where the Sun stands overhead.
  const localSolarHours = normalizeHours(
    12 + normalizeLongitude(observer.longitude - subsolarLongitude) / 15,
  )

  const site = new Observer(observer.latitude, observer.longitude, 0)
  const topocentric = Equator(Body.Sun, date, site, true, true)
  const horizon = Horizon(date, site, topocentric.ra, topocentric.dec, 'normal')

  return {
    subsolarLatitude: geocentric.dec,
    subsolarLongitude,
    localSolarHours,
    sunAltitudeDeg: horizon.altitude,
    daylight: horizon.altitude > 0,
  }
}

export function formatSolarClock(localSolarHours: number): string {
  if (!Number.isFinite(localSolarHours)) {
    throw new Error(`Invalid local solar hour: ${localSolarHours}`)
  }
  const total = Math.round(normalizeHours(localSolarHours) * 60)
  const hours = Math.floor(total / 60) % 24
  const minutes = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
