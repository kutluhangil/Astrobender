import type { SkyObserver } from './sky-events.ts'

export const SKYWATCH_LOCATION_STORAGE_KEY = 'astrobender.skywatch-location.v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateSkywatchCoordinates(
  latitude: number,
  longitude: number,
  label: string,
): SkyObserver {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error(`Skywatch latitude must be between -90 and 90; received ${latitude}`)
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error(`Skywatch longitude must be between -180 and 180; received ${longitude}`)
  }
  if (!label.trim()) throw new Error('Skywatch location label is required')
  return { latitude, longitude, label: label.trim() }
}

export function parseSkywatchObserver(value: string): SkyObserver | null {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!isRecord(parsed)) return null
    if (typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number' || typeof parsed.label !== 'string') {
      return null
    }
    return validateSkywatchCoordinates(parsed.latitude, parsed.longitude, parsed.label)
  } catch {
    return null
  }
}

export function serializeSkywatchObserver(observer: SkyObserver): string {
  return JSON.stringify(validateSkywatchCoordinates(observer.latitude, observer.longitude, observer.label))
}
