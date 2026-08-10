import { useCallback, useState } from 'react'
import type { SkyObserver } from '@/lib/sky-events'
import {
  parseSkywatchObserver,
  serializeSkywatchObserver,
  SKYWATCH_LOCATION_STORAGE_KEY,
  validateSkywatchCoordinates,
} from '@/lib/skywatch-location'

interface InitialLocationState {
  observer: SkyObserver | null
  error: string | null
}

function loadInitialLocation(): InitialLocationState {
  try {
    const serialized = window.localStorage.getItem(SKYWATCH_LOCATION_STORAGE_KEY)
    if (serialized === null) return { observer: null, error: null }
    const observer = parseSkywatchObserver(serialized)
    if (observer) return { observer, error: null }
    return {
      observer: null,
      error: 'Saved Skywatch location is invalid. Enter a new latitude and longitude.',
    }
  } catch (error) {
    return {
      observer: null,
      error: `Skywatch location could not be read: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export function useSkywatchLocation() {
  const [initial] = useState(loadInitialLocation)
  const [observer, setObserver] = useState<SkyObserver | null>(initial.observer)
  const [error, setError] = useState<string | null>(initial.error)

  const persist = useCallback((next: SkyObserver): boolean => {
    try {
      window.localStorage.setItem(SKYWATCH_LOCATION_STORAGE_KEY, serializeSkywatchObserver(next))
      setObserver(next)
      setError(null)
      return true
    } catch (storageError) {
      setError(`Skywatch location could not be saved: ${storageError instanceof Error ? storageError.message : String(storageError)}`)
      return false
    }
  }, [])

  const saveManualLocation = useCallback((latitude: number, longitude: number, label: string): boolean => {
    try {
      return persist(validateSkywatchCoordinates(latitude, longitude, label))
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : String(validationError))
      return false
    }
  }, [persist])

  const requestBrowserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Browser geolocation is unavailable. Enter coordinates manually.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        persist({
          latitude,
          longitude,
          label: `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`,
        })
      },
      (positionError) => {
        setError(`Browser location request failed (${positionError.code}): ${positionError.message}`)
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 15 * 60_000 },
    )
  }, [persist])

  const clearLocation = useCallback(() => {
    try {
      window.localStorage.removeItem(SKYWATCH_LOCATION_STORAGE_KEY)
      setObserver(null)
      setError(null)
    } catch (storageError) {
      setError(`Skywatch location could not be cleared: ${storageError instanceof Error ? storageError.message : String(storageError)}`)
    }
  }, [])

  return { observer, error, requestBrowserLocation, saveManualLocation, clearLocation }
}
