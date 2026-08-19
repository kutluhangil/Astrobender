import {
  Body,
  Equator,
  Horizon,
  Illumination,
  Observer,
} from 'astronomy-engine'
import type { SkyObserver } from './sky-events.ts'
import type { UiLanguage } from './ui-language.ts'
import { PERSEID_2026 } from './meteor-calendar.ts'

export { PERSEID_2026 } from './meteor-calendar.ts'

export type PerseidStatus = 'upcoming' | 'active' | 'maximum-window' | 'completed'

export interface PerseidWatch {
  status: PerseidStatus
  activeStart: string
  activeEnd: string
  maximumStart: string
  maximumEnd: string
  observedAt: string
  parentBody: string
  zhr: number
  moonIlluminationPercent: number
  sourceUrl: string
  reportUrl: string
  fireballUrl: string
  observer: {
    label: string
    radiantAltitudeDegrees: number
    radiantAzimuthDegrees: number
    sunAltitudeDegrees: number
    productHeuristic: number
  } | null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function productHeuristic(radiantAltitudeDegrees: number, sunAltitudeDegrees: number, moonIlluminationPercent: number): number {
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

export function getPerseidWatch(now: Date, observer?: SkyObserver): PerseidWatch | null {
  if (now.getUTCFullYear() !== 2026) return null

  const activeStartMs = Date.parse(PERSEID_2026.activeStart)
  const activeEndMs = Date.parse(PERSEID_2026.activeEnd)
  const maximumStartMs = Date.parse(PERSEID_2026.maximumStart)
  const maximumEndMs = Date.parse(PERSEID_2026.maximumEnd)
  const nowMs = now.getTime()
  const status: PerseidStatus = nowMs < activeStartMs
    ? 'upcoming'
    : nowMs > activeEndMs
      ? 'completed'
      : nowMs >= maximumStartMs && nowMs <= maximumEndMs
        ? 'maximum-window'
        : 'active'
  const moonIlluminationPercent = Math.round(Illumination(Body.Moon, now).phase_fraction * 100)
  const shared = {
    ...PERSEID_2026,
    observedAt: now.toISOString(),
    reportUrl: 'https://www.imo.net/observations/methods/visual-observation/major/report/',
    fireballUrl: 'https://www.imo.net/observations/fireballs/fireball-report-program/',
  }

  if (!observer) {
    return {
      status,
      ...shared,
      moonIlluminationPercent,
      observer: null,
    }
  }

  const astronomyObserver = new Observer(observer.latitude, observer.longitude, 0)
  const radiant = Horizon(
    now,
    astronomyObserver,
    PERSEID_2026.radiant.rightAscensionHours,
    PERSEID_2026.radiant.declinationDegrees,
    'normal',
  )
  const sunEquator = Equator(Body.Sun, now, astronomyObserver, true, true)
  const sun = Horizon(now, astronomyObserver, sunEquator.ra, sunEquator.dec, 'normal')

  return {
    status,
    ...shared,
    moonIlluminationPercent,
    observer: {
      label: observer.label,
      radiantAltitudeDegrees: radiant.altitude,
      radiantAzimuthDegrees: radiant.azimuth,
      sunAltitudeDegrees: sun.altitude,
      productHeuristic: productHeuristic(radiant.altitude, sun.altitude, moonIlluminationPercent),
    },
  }
}
