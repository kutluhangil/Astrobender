import {
  Body,
  Equator,
  Horizon,
  Observer,
} from 'astronomy-engine'
import {
  IMO_FIREBALL_REPORT_URL,
  IMO_HOME_URL,
  findMeteorShower,
  moonIlluminationPercent as moonIlluminationAt,
  showerApparition,
} from './meteor-showers.ts'
import type { SkyObserver } from './sky-events.ts'
import type { UiLanguage } from './ui-language.ts'

const PERSEIDS = findMeteorShower('perseids')
const HOUR_MS = 3_600_000

/** A finished season never shows: the card moves on to the next year's Perseids. */
export type PerseidStatus = 'upcoming' | 'active' | 'peak'

export interface PerseidWatch {
  status: PerseidStatus
  /** Year of the maximum this card describes. */
  year: number
  activeStart: string
  activeEnd: string
  peakStart: string
  peakEnd: string
  peakAt: string
  parentBody: string
  /** IMO forecast as published, e.g. "110+". */
  zhr: string
  /** Radiant at maximum, J2000. */
  radiant: { rightAscensionHours: number; declinationDegrees: number }
  moonIlluminationPercent: number
  sourceUrl: string
  reportUrl: string
  fireballUrl: string
  observer: {
    label: string
    radiantAltitudeDegrees: number
    radiantAzimuthDegrees: number
    sunAltitudeDegrees: number
    astronomicalScore: number
  } | null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function observerScore(radiantAltitudeDegrees: number, sunAltitudeDegrees: number, moonIlluminationPercent: number): number {
  const radiant = clamp(radiantAltitudeDegrees / 50, 0, 1) * 65
  const darkness = sunAltitudeDegrees <= -18 ? 10 : sunAltitudeDegrees <= -12 ? 8 : sunAltitudeDegrees <= -6 ? 2 : 0
  const moon = (1 - clamp(moonIlluminationPercent, 0, 100) / 100) * 25
  return Math.round(clamp(radiant + darkness + moon, 0, 100))
}

export function directionLabel(azimuthDegrees: number, language: UiLanguage): string {
  const directions = language === 'tr'
    ? ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB']
    : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const normalized = ((azimuthDegrees % 360) + 360) % 360
  return directions[Math.round(normalized / 45) % directions.length]
}

/**
 * The Perseids of the current season, or of next year once this season's
 * activity has ended. The maximum is the instant the Sun reaches the IMO node
 * longitude; the two-hour peak window starts on the hour before it, which
 * reproduces the IMO 2026 (02–04 UT) and 2027 (08–10 UT) windows.
 */
export function getPerseidWatch(now: Date, observer?: SkyObserver): PerseidWatch {
  const nowMs = now.getTime()
  let apparition = showerApparition(PERSEIDS, now.getUTCFullYear())
  if (nowMs > apparition.activeEnd.getTime()) {
    apparition = showerApparition(PERSEIDS, now.getUTCFullYear() + 1)
  }
  const peakStartMs = Math.floor(apparition.peakAt.getTime() / HOUR_MS) * HOUR_MS
  const peakEndMs = peakStartMs + 2 * HOUR_MS
  const status: PerseidStatus = nowMs < apparition.activeStart.getTime()
    ? 'upcoming'
    : nowMs >= peakStartMs && nowMs <= peakEndMs
      ? 'peak'
      : 'active'
  const moonIlluminationPercent = moonIlluminationAt(apparition.peakAt)
  const radiant = {
    rightAscensionHours: PERSEIDS.radiant.raDeg / 15,
    declinationDegrees: PERSEIDS.radiant.decDeg,
  }
  const base = {
    status,
    year: apparition.year,
    activeStart: apparition.activeStart.toISOString(),
    activeEnd: apparition.activeEnd.toISOString(),
    peakStart: new Date(peakStartMs).toISOString(),
    peakEnd: new Date(peakEndMs).toISOString(),
    peakAt: apparition.peakAt.toISOString(),
    parentBody: PERSEIDS.parentBody,
    zhr: apparition.zhr,
    radiant,
    moonIlluminationPercent,
    sourceUrl: apparition.sourceUrl,
    // IMO's visual report forms were offline during its 2026 rebuild; the
    // home page states which services are available.
    reportUrl: IMO_HOME_URL,
    fireballUrl: IMO_FIREBALL_REPORT_URL,
  }

  if (!observer) return { ...base, observer: null }

  const astronomyObserver = new Observer(observer.latitude, observer.longitude, 0)
  const radiantNow = Horizon(
    now,
    astronomyObserver,
    radiant.rightAscensionHours,
    radiant.declinationDegrees,
    'normal',
  )
  const sunEquator = Equator(Body.Sun, now, astronomyObserver, true, true)
  const sun = Horizon(now, astronomyObserver, sunEquator.ra, sunEquator.dec, 'normal')

  return {
    ...base,
    observer: {
      label: observer.label,
      radiantAltitudeDegrees: radiantNow.altitude,
      radiantAzimuthDegrees: radiantNow.azimuth,
      sunAltitudeDegrees: sun.altitude,
      astronomicalScore: observerScore(radiantNow.altitude, sun.altitude, moonIlluminationPercent),
    },
  }
}
