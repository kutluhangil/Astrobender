import { useCallback, useEffect, useRef, useState } from 'react'
import {
  EARTH_DATA_URLS,
  fetchJson,
  parseEonetEvents,
  parseNoaaAurora,
  parseUsgsEarthquakes,
  type AuroraForecast,
  type EarthEvent,
} from '@/lib/earth-observatory'

export interface EarthObservatoryState {
  status: 'idle' | 'loading' | 'ready' | 'partial' | 'error'
  events: EarthEvent[]
  aurora: AuroraForecast | null
  errors: Partial<Record<'eonet' | 'usgs' | 'aurora', string>>
  updatedAt: number | null
}

const INITIAL_STATE: EarthObservatoryState = {
  status: 'idle',
  events: [],
  aurora: null,
  errors: {},
  updatedAt: null,
}

const REQUEST_TIMEOUT_MS = 12000

export function useEarthObservatory(enabled: boolean) {
  const [state, setState] = useState<EarthObservatoryState>(INITIAL_STATE)
  const generationRef = useRef(0)
  const controllerRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    const generation = ++generationRef.current
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    setState((current) => ({ ...current, status: 'loading', errors: {} }))

    try {
      const [eonetResult, usgsResult, auroraResult] = await Promise.allSettled([
        fetchJson(EARTH_DATA_URLS.eonet, controller.signal).then(parseEonetEvents),
        fetchJson(EARTH_DATA_URLS.usgs, controller.signal).then(parseUsgsEarthquakes),
        fetchJson(EARTH_DATA_URLS.aurora, controller.signal).then(parseNoaaAurora),
      ])
      if (generationRef.current !== generation) return

      const errors: EarthObservatoryState['errors'] = {}
      const eonetEvents = eonetResult.status === 'fulfilled' ? eonetResult.value : []
      const earthquakes = usgsResult.status === 'fulfilled' ? usgsResult.value : []
      const aurora = auroraResult.status === 'fulfilled' ? auroraResult.value : null
      if (eonetResult.status === 'rejected') {
        errors.eonet = eonetResult.reason instanceof Error
          ? eonetResult.reason.message
          : String(eonetResult.reason)
      }
      if (usgsResult.status === 'rejected') {
        errors.usgs = usgsResult.reason instanceof Error
          ? usgsResult.reason.message
          : String(usgsResult.reason)
      }
      if (auroraResult.status === 'rejected') {
        errors.aurora = auroraResult.reason instanceof Error
          ? auroraResult.reason.message
          : String(auroraResult.reason)
      }
      const failureCount = Object.keys(errors).length
      setState({
        status: failureCount === 0 ? 'ready' : failureCount === 3 ? 'error' : 'partial',
        events: [...earthquakes, ...eonetEvents],
        aurora,
        errors,
        updatedAt: Date.now(),
      })
    } finally {
      window.clearTimeout(timeoutId)
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void refresh()
    return () => {
      generationRef.current += 1
      controllerRef.current?.abort()
      controllerRef.current = null
    }
  }, [enabled, refresh])

  return { ...state, refresh }
}
