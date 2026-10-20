import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchNasaFeed,
  parseApod,
  parseCoronalMassEjections,
  parseEpic,
  parseExoplanetCount,
  parseExoplanets,
  parseFireballs,
  parseGeomagneticStorms,
  parseHorizonsRange,
  parseScout,
  parseSentry,
  parseSolarFlares,
  type AstronomyPicture,
  type CoronalMassEjection,
  type EpicImage,
  type Exoplanet,
  type Fireball,
  type GeomagneticStorm,
  type NasaFeedId,
  type ProbeRange,
  type ScoutObject,
  type SentryTable,
  type SolarFlare,
} from '@/lib/nasa-feeds'

export type NasaTopic =
  | 'space-weather'
  | 'impact-risk'
  | 'fireballs'
  | 'voyager'
  | 'earth'
  | 'picture'
  | 'exoplanets'

export interface FeedState<T> {
  status: 'idle' | 'loading' | 'ready' | 'error'
  data: T | null
  error: string | null
  updatedAt: number | null
}

const IDLE: FeedState<never> = { status: 'idle', data: null, error: null, updatedAt: null }
const FEED_TIMEOUT_MS = 30_000

export interface NasaTopicData {
  'space-weather': { flares: SolarFlare[]; cmes: CoronalMassEjection[]; storms: GeomagneticStorm[] }
  'impact-risk': { sentry: SentryTable; scout: ScoutObject[] }
  fireballs: Fireball[]
  voyager: { voyager1: ProbeRange; voyager2: ProbeRange }
  earth: EpicImage[]
  picture: AstronomyPicture
  exoplanets: { recent: Exoplanet[]; confirmed: number }
}

type Loaders = { [K in NasaTopic]: (signal: AbortSignal) => Promise<NasaTopicData[K]> }

const load = (feed: NasaFeedId, signal: AbortSignal) => fetchNasaFeed(feed, signal)

const LOADERS: Loaders = {
  'space-weather': async (signal) => {
    const [flares, cmes, storms] = await Promise.all([
      load('donki-flares', signal),
      load('donki-cme', signal),
      load('donki-storms', signal),
    ])
    return {
      flares: parseSolarFlares(flares),
      cmes: parseCoronalMassEjections(cmes),
      storms: parseGeomagneticStorms(storms),
    }
  },
  'impact-risk': async (signal) => {
    const [sentry, scout] = await Promise.all([load('sentry', signal), load('scout', signal)])
    return { sentry: parseSentry(sentry), scout: parseScout(scout) }
  },
  fireballs: async (signal) => parseFireballs(await load('fireball', signal)),
  voyager: async (signal) => {
    const [one, two] = await Promise.all([load('voyager-1', signal), load('voyager-2', signal)])
    return { voyager1: parseHorizonsRange(one), voyager2: parseHorizonsRange(two) }
  },
  earth: async (signal) => parseEpic(await load('epic', signal)),
  picture: async (signal) => parseApod(await load('apod', signal)),
  exoplanets: async (signal) => {
    const [recent, count] = await Promise.all([
      load('exoplanets-recent', signal),
      load('exoplanets-count', signal),
    ])
    return { recent: parseExoplanets(recent), confirmed: parseExoplanetCount(count) }
  },
}

/** Loads one NASA topic when it becomes the active tab and keeps each topic's result for the session. */
export function useNasaTopic<T extends NasaTopic>(topic: T, enabled: boolean) {
  const [state, setState] = useState<FeedState<NasaTopicData[T]>>(IDLE)
  const controllerRef = useRef<AbortController | null>(null)
  const generationRef = useRef(0)

  const refresh = useCallback(async () => {
    const generation = ++generationRef.current
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const timeoutId = window.setTimeout(() => controller.abort(), FEED_TIMEOUT_MS)
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const data = await LOADERS[topic](controller.signal)
      if (generationRef.current !== generation) return
      setState({ status: 'ready', data: data as NasaTopicData[T], error: null, updatedAt: Date.now() })
    } catch (error) {
      if (generationRef.current !== generation) return
      const message = error instanceof DOMException && error.name === 'AbortError'
        ? `NASA feed "${topic}" timed out after ${FEED_TIMEOUT_MS} ms`
        : error instanceof Error ? error.message : String(error)
      setState((current) => ({ ...current, status: 'error', error: message, updatedAt: Date.now() }))
    } finally {
      window.clearTimeout(timeoutId)
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [topic])

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
