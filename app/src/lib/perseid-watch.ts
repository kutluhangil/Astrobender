import {
  Body,
  Equator,
  Horizon,
  Illumination,
  Observer,
} from 'astronomy-engine'
import type { SkyObserver } from './sky-events.ts'
import type { UiLanguage } from './ui-language.ts'

export const PERSEID_2026 = {
  activeStart: '2026-07-17T00:00:00.000Z',
  activeEnd: '2026-08-24T23:59:59.999Z',
  peakStart: '2026-08-13T02:00:00.000Z',
  peakEnd: '2026-08-13T04:00:00.000Z',
  peakAt: '2026-08-13T03:00:00.000Z',
  parentBody: '109P/Swift-Tuttle',
  zhr: 100,
  sourceUrl: 'https://www.imo.net/files/meteor-shower/cal2026.pdf',
  reportUrl: 'https://www.imo.net/observations/methods/visual-observation/major/report/',
  fireballUrl: 'https://www.imo.net/observations/fireballs/fireball-report-program/',
  radiant: {
    rightAscensionHours: 3.2,
    declinationDegrees: 58,
  },
} as const

export type PerseidStatus = 'upcoming' | 'active' | 'peak' | 'completed'

export interface PerseidWatch {
  status: PerseidStatus
  activeStart: string
  activeEnd: string
  peakStart: string
  peakEnd: string
  peakAt: string
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

export function getPerseidWatch(now: Date, observer?: SkyObserver): PerseidWatch | null {
  if (now.getUTCFullYear() !== 2026) return null

  const activeStartMs = Date.parse(PERSEID_2026.activeStart)
  const activeEndMs = Date.parse(PERSEID_2026.activeEnd)
  const peakStartMs = Date.parse(PERSEID_2026.peakStart)
  const peakEndMs = Date.parse(PERSEID_2026.peakEnd)
  const nowMs = now.getTime()
  const status: PerseidStatus = nowMs < activeStartMs
    ? 'upcoming'
    : nowMs > activeEndMs
      ? 'completed'
      : nowMs >= peakStartMs && nowMs <= peakEndMs
        ? 'peak'
        : 'active'
  const peakAt = new Date(PERSEID_2026.peakAt)
  const moonIlluminationPercent = Math.round(Illumination(Body.Moon, peakAt).phase_fraction * 100)

  if (!observer) {
    return {
      status,
      ...PERSEID_2026,
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
    ...PERSEID_2026,
    moonIlluminationPercent,
    observer: {
      label: observer.label,
      radiantAltitudeDegrees: radiant.altitude,
      radiantAzimuthDegrees: radiant.azimuth,
      sunAltitudeDegrees: sun.altitude,
      astronomicalScore: observerScore(radiant.altitude, sun.altitude, moonIlluminationPercent),
    },
  }
}
