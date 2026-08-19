import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buildDataset,
  isValidTleText,
  MIN_VALID_SATS,
  mergeOmmFeeds,
  mergeFeeds,
} from '@/lib/satellites'
import type { Dataset, FeedOmmRecords, FeedTexts, SatInfo } from '@/lib/satellites'
import { cacheGet, cacheSet } from '@/lib/tle-cache'
import { TLE_SNAPSHOT_DOWNLOADED_AT } from '@/lib/tle-snapshot-metadata'
import { getCelestrakFeedMetadata, parseCelestrakOmmCsv } from '@/lib/celestrak-omm'

const SNAP = `${import.meta.env.BASE_URL}data`
const TLE_API = '/api/tle'

interface FeedDef {
  key: keyof FeedTexts
  liveUrl: string
  snapUrl: string
}

const FEEDS: FeedDef[] = [
  {
    key: 'active',
    liveUrl: `${TLE_API}?feed=active&format=csv`,
    snapUrl: `${SNAP}/tle-snapshot.txt`,
  },
  {
    key: 'visual',
    liveUrl: `${TLE_API}?feed=visual&format=csv`,
    snapUrl: `${SNAP}/tle-visual.txt`,
  },
  {
    key: 'cosmos2251',
    liveUrl: `${TLE_API}?feed=cosmos2251&format=csv`,
    snapUrl: `${SNAP}/tle-cosmos-2251-debris.txt`,
  },
  {
    key: 'iridium33',
    liveUrl: `${TLE_API}?feed=iridium33&format=csv`,
    snapUrl: `${SNAP}/tle-iridium-33-debris.txt`,
  },
  {
    key: 'fengyun1c',
    liveUrl: `${TLE_API}?feed=fengyun1c&format=csv`,
    snapUrl: `${SNAP}/tle-fengyun-1c-debris.txt`,
  },
]

export const TLE_TTL_MS = 2 * 3600 * 1000
const CACHE_KEY = 'omm-bundle-v1'

export interface TleDataState {
  /** 'loading' only until the first usable dataset exists. */
  status: 'loading' | 'ready' | 'error'
  dataset: Dataset | null
  error: string | null
  warning: string | null
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) {
      const body = (await res.text()).replace(/\s+/g, ' ').slice(0, 180)
      throw new Error(
        `TLE request failed: ${url} returned HTTP ${res.status} ${res.statusText}${body ? ` — ${body}` : ''}`,
      )
    }
    return await res.text()
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`TLE request timed out after ${timeoutMs} ms: ${url}`)
    }
    throw error
  } finally {
    clearTimeout(t)
  }
}

function validateSnapshots(feeds: FeedTexts) {
  if (!isValidTleText(feeds.active)) throw new Error('invalid TLE structure')
  const sats = mergeFeeds(feeds)
  const activeCount = sats.filter((s) => s.group !== 8 && s.group !== 9 && s.group !== 10).length
  if (activeCount < MIN_VALID_SATS) {
    throw new Error(`too few satellites (${activeCount})`)
  }
  return sats
}

function validateLiveOmm(inputFeeds: FeedTexts): SatInfo[] {
  const active = parseCelestrakOmmCsv(inputFeeds.active, getCelestrakFeedMetadata('active'))
  if (active.length < MIN_VALID_SATS) {
    throw new Error(`too few OMM satellites (${active.length})`)
  }
  const ommFeeds: FeedOmmRecords = {
    active,
    visual: parseCelestrakOmmCsv(requireLiveOmmFeed(inputFeeds.visual, 'visual'), getCelestrakFeedMetadata('visual')),
    cosmos2251: parseCelestrakOmmCsv(requireLiveOmmFeed(inputFeeds.cosmos2251, 'cosmos2251'), getCelestrakFeedMetadata('cosmos2251')),
    iridium33: parseCelestrakOmmCsv(requireLiveOmmFeed(inputFeeds.iridium33, 'iridium33'), getCelestrakFeedMetadata('iridium33')),
    fengyun1c: parseCelestrakOmmCsv(requireLiveOmmFeed(inputFeeds.fengyun1c, 'fengyun1c'), getCelestrakFeedMetadata('fengyun1c')),
  }
  return mergeOmmFeeds(ommFeeds)
}

function requireLiveOmmFeed(text: string | null, feed: Exclude<keyof FeedTexts, 'active'>): string {
  if (text === null) throw new Error(`OMM ${feed} feed is missing from the complete live refresh`)
  return text
}

/**
 * Data pipeline:
 *  1. bundled snapshots (5 feeds in parallel) -> immediate first render
 *  2. IndexedDB cache (fresh < 2h) -> upgrade to CACHED
 *  3. complete five-feed same-origin CelesTrak OMM refresh -> LIVE + re-cache
 * Generation ids ignore stale responses; the old dataset stays active until
 * a complete validated replacement is ready.
 */
export function useTleData() {
  const [state, setState] = useState<TleDataState>({
    status: 'loading',
    dataset: null,
    error: null,
    warning: null,
  })
  const genRef = useRef(0)
  const busyRef = useRef(false)
  const snapTextsRef = useRef<FeedTexts | null>(null)
  const invalidate = useCallback(() => {
    genRef.current += 1
  }, [])

  const apply = useCallback(
    (
      sats: SatInfo[],
      source: Dataset['source'],
      fetchedAt: number,
      warning: string | null = null,
    ) => {
      setState({
        status: 'ready',
        dataset: buildDataset(sats, source, fetchedAt),
        error: null,
        warning,
      })
    },
    [],
  )

  const loadSnapshots = useCallback(async (): Promise<FeedTexts> => {
    if (snapTextsRef.current) return snapTextsRef.current
    const texts = await Promise.all(FEEDS.map((f) => fetchText(f.snapUrl, 30000)))
    const feeds = Object.fromEntries(
      FEEDS.map((f, i) => [f.key, texts[i]]),
    ) as unknown as FeedTexts
    snapTextsRef.current = feeds
    return feeds
  }, [])

  /** Background OMM refresh; a failed source never replaces the last valid dataset. */
  const refreshLive = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    const myGen = genRef.current
    try {
      const texts = await Promise.all(FEEDS.map((feed) => fetchText(feed.liveUrl, 20000)))
      if (genRef.current !== myGen) return
      const feeds = Object.fromEntries(FEEDS.map((feed, index) => [feed.key, texts[index]])) as unknown as FeedTexts
      const sats = validateLiveOmm(feeds)
      const fetchedAt = Date.now()
      apply(sats, 'live', fetchedAt)
      try {
        await cacheSet({
          key: CACHE_KEY,
          texts: feeds,
          format: 'omm-bundle-csv-v1',
          fetchedAt,
        })
      } catch (error) {
        setState((current) => ({
          ...current,
          warning: `Canlı OMM verisi yüklendi ancak yerel önbellek güncellenemedi: ${error instanceof Error ? error.message : String(error)}`,
        }))
      }
    } catch (error) {
      setState((current) => ({
        ...current,
        warning: `Canlı OMM güncellemesi başarısız; son geçerli veri kullanılıyor. ${error instanceof Error ? error.message : String(error)}`,
      }))
    } finally {
      busyRef.current = false
    }
  }, [apply])

  const initialLoad = useCallback(async () => {
    const gen = ++genRef.current
    const isStale = () => genRef.current !== gen

    // 1. snapshots first — the globe must appear within ~2 seconds
    try {
      const feeds = await loadSnapshots()
      if (isStale()) return
      apply(validateSnapshots(feeds), 'snapshot', TLE_SNAPSHOT_DOWNLOADED_AT)
    } catch (err) {
      if (isStale()) return
      setState({
        status: 'error',
        dataset: null,
        error: err instanceof Error ? err.message : String(err),
        warning: null,
      })
      // continue anyway: live fetch below may still succeed
    }

    // 2. fresh cache from a previous session -> CACHED
    try {
      const cached = await cacheGet(CACHE_KEY)
      if (cached?.format === 'omm-bundle-csv-v1' && Date.now() - cached.fetchedAt < TLE_TTL_MS) {
        if (isStale()) return
        apply(validateLiveOmm(cached.texts), 'cached', cached.fetchedAt)
      }
    } catch (error) {
      setState((current) => ({
        ...current,
        warning: `Yerel OMM önbelleği okunamadı; paketlenmiş veri kullanılıyor. ${error instanceof Error ? error.message : String(error)}`,
      }))
    }

    // 3. live fetch in background
    void refreshLive()
  }, [apply, loadSnapshots, refreshLive])

  useEffect(() => {
    void initialLoad()
    const id = setInterval(() => void refreshLive(), TLE_TTL_MS)
    return () => {
      invalidate() // ignore in-flight responses after unmount
      clearInterval(id)
    }
  }, [initialLoad, refreshLive, invalidate])

  return { ...state, retry: refreshLive }
}
