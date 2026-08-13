import { useCallback, useEffect, useRef, useState } from 'react'
import {
  EARTH_OBSERVATORY_CACHE_KEY,
  EARTH_DATA_URLS,
  fetchJson,
  parseEarthObservatoryCache,
  parseEonetEvents,
  parseNoaaAurora,
  parseUsgsEarthquakes,
  type AuroraForecast,
  type EarthObservatoryCache,
  type EarthEvent,
  type EarthSourceId,
} from '@/lib/earth-observatory'
import { reduceEarthRefreshUpdatedAt } from '@/lib/tle-snapshot-metadata'

export interface EarthObservatoryState {
  status: 'idle' | 'loading' | 'ready' | 'partial' | 'error'
  events: EarthEvent[]
  aurora: AuroraForecast | null
  errors: Partial<Record<EarthSourceId | 'cache', string>>
  updatedAt: number | null
  cachedSources: EarthSourceId[]
  sourceUpdatedAt: Partial<Record<EarthSourceId, number>>
}

const INITIAL_STATE: EarthObservatoryState = {
  status: 'idle',
  events: [],
  aurora: null,
  errors: {},
  updatedAt: null,
  cachedSources: [],
  sourceUpdatedAt: {},
}

const REQUEST_TIMEOUT_MS = 12000

function readCache(): { cache: EarthObservatoryCache; error?: string } {
  try {
    const serialized = window.localStorage.getItem(EARTH_OBSERVATORY_CACHE_KEY)
    return {
      cache: serialized
        ? parseEarthObservatoryCache(serialized)
        : { version: 1, sources: {} },
    }
  } catch (error) {
    return {
      cache: { version: 1, sources: {} },
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function writeCache(cache: EarthObservatoryCache): string | undefined {
  try {
    window.localStorage.setItem(EARTH_OBSERVATORY_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    return `Earth Observatory cache could not be saved: ${
      error instanceof Error ? error.message : String(error)
    }`
  }
}

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
    const { cache, error: cacheReadError } = readCache()
    const cachedSources = Object.keys(cache.sources) as EarthSourceId[]
    const cachedEvents = [
      ...(cache.sources.usgs?.data ?? []),
      ...(cache.sources.eonet?.data ?? []),
    ]
    setState({
      status: 'loading',
      events: cachedEvents,
      aurora: cache.sources.aurora?.data ?? null,
      errors: cacheReadError ? { cache: cacheReadError } : {},
      updatedAt: cachedSources.length
        ? Math.max(...cachedSources.map((source) => cache.sources[source]?.fetchedAt ?? 0))
        : null,
      cachedSources,
      sourceUpdatedAt: Object.fromEntries(
        cachedSources.map((source) => [source, cache.sources[source]?.fetchedAt]),
      ),
    })

    try {
      const [eonetResult, usgsResult, auroraResult] = await Promise.allSettled([
        fetchJson(EARTH_DATA_URLS.eonet, controller.signal).then(parseEonetEvents),
        fetchJson(EARTH_DATA_URLS.usgs, controller.signal).then(parseUsgsEarthquakes),
        fetchJson(EARTH_DATA_URLS.aurora, controller.signal).then(parseNoaaAurora),
      ])
      if (generationRef.current !== generation) return

      const errors: EarthObservatoryState['errors'] = cacheReadError
        ? { cache: cacheReadError }
        : {}
      const now = Date.now()
      const nextCache: EarthObservatoryCache = {
        version: 1,
        sources: { ...cache.sources },
      }
      const usedCachedSources: EarthSourceId[] = []
      const eonetEvents = eonetResult.status === 'fulfilled'
        ? eonetResult.value
        : (cache.sources.eonet?.data ?? [])
      const earthquakes = usgsResult.status === 'fulfilled'
        ? usgsResult.value
        : (cache.sources.usgs?.data ?? [])
      const aurora = auroraResult.status === 'fulfilled'
        ? auroraResult.value
        : (cache.sources.aurora?.data ?? null)
      if (eonetResult.status === 'fulfilled') {
        nextCache.sources.eonet = { fetchedAt: now, data: eonetEvents }
      } else if (cache.sources.eonet) usedCachedSources.push('eonet')
      if (usgsResult.status === 'fulfilled') {
        nextCache.sources.usgs = { fetchedAt: now, data: earthquakes }
      } else if (cache.sources.usgs) usedCachedSources.push('usgs')
      if (auroraResult.status === 'fulfilled') {
        nextCache.sources.aurora = { fetchedAt: now, data: auroraResult.value }
      } else if (cache.sources.aurora) usedCachedSources.push('aurora')
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
      const cacheWriteError = writeCache(nextCache)
      if (cacheWriteError) errors.cache = cacheWriteError
      const sourceFailureCount = ['eonet', 'usgs', 'aurora'].filter(
        (source) => errors[source as EarthSourceId],
      ).length
      const sourceUpdatedAt = Object.fromEntries(
        (Object.keys(nextCache.sources) as EarthSourceId[]).map((source) => [
          source,
          nextCache.sources[source]?.fetchedAt,
        ]),
      )
      const cachedUpdatedAt = cachedSources.length
        ? Math.max(...cachedSources.map((source) => cache.sources[source]?.fetchedAt ?? 0))
        : null
      setState({
        status:
          sourceFailureCount === 0
            ? 'ready'
            : sourceFailureCount === 3 && usedCachedSources.length === 0
              ? 'error'
              : 'partial',
        events: [...earthquakes, ...eonetEvents],
        aurora,
        errors,
        updatedAt: reduceEarthRefreshUpdatedAt(
          cachedUpdatedAt,
          [eonetResult, usgsResult, auroraResult],
          now,
        ),
        cachedSources: usedCachedSources,
        sourceUpdatedAt,
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
