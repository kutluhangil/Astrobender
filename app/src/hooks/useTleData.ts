import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buildDataset,
  isValidTleText,
  MIN_VALID_SATS,
  mergeFeeds,
} from '@/lib/satellites'
import type { Dataset, FeedTexts } from '@/lib/satellites'
import { cacheGet, cacheSet } from '@/lib/tle-cache'

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
    liveUrl: `${TLE_API}?feed=active`,
    snapUrl: `${SNAP}/tle-snapshot.txt`,
  },
  {
    key: 'visual',
    liveUrl: `${TLE_API}?feed=visual`,
    snapUrl: `${SNAP}/tle-visual.txt`,
  },
  {
    key: 'cosmos2251',
    liveUrl: `${TLE_API}?feed=cosmos2251`,
    snapUrl: `${SNAP}/tle-cosmos-2251-debris.txt`,
  },
  {
    key: 'iridium33',
    liveUrl: `${TLE_API}?feed=iridium33`,
    snapUrl: `${SNAP}/tle-iridium-33-debris.txt`,
  },
  {
    key: 'fengyun1c',
    liveUrl: `${TLE_API}?feed=fengyun1c`,
    snapUrl: `${SNAP}/tle-fengyun-1c-debris.txt`,
  },
]

export const TLE_TTL_MS = 2 * 3600 * 1000
const CACHE_KEY = 'bundle-v2'

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

function validate(feeds: FeedTexts) {
  if (!isValidTleText(feeds.active)) throw new Error('invalid TLE structure')
  const sats = mergeFeeds(feeds)
  const activeCount = sats.filter((s) => s.group !== 8 && s.group !== 9 && s.group !== 10).length
  if (activeCount < MIN_VALID_SATS) {
    throw new Error(`too few satellites (${activeCount})`)
  }
  return sats
}

/**
 * Data pipeline:
 *  1. bundled snapshots (5 feeds in parallel) -> immediate first render
 *  2. IndexedDB cache (fresh < 2h) -> upgrade to CACHED
 *  3. same-origin CelesTrak proxy refresh in background -> upgrade to LIVE + re-cache
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
      feeds: FeedTexts,
      source: Dataset['source'],
      fetchedAt: number,
      warning: string | null = null,
    ) => {
      const sats = validate(feeds)
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

  /** Background live refresh; keeps the last dataset and surfaces failures. */
  const refreshLive = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    const myGen = genRef.current
    try {
      const results = await Promise.allSettled(
        FEEDS.map((f) => fetchText(f.liveUrl, 20000)),
      )
      if (genRef.current !== myGen) return
      const base = snapTextsRef.current ?? (await loadSnapshots())
      const feeds = { ...base }
      const failures: string[] = []
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && isValidTleText(r.value)) {
          feeds[FEEDS[i].key] = r.value
        } else if (r.status === 'fulfilled') {
          failures.push(`${FEEDS[i].key}: invalid TLE structure`)
        } else {
          failures.push(
            `${FEEDS[i].key}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`,
          )
        }
      })
      const activeLive =
        results[0].status === 'fulfilled' && isValidTleText(results[0].value)
      if (!activeLive) {
        throw new Error(failures[0] ?? 'active feed did not return valid TLE data')
      }
      const fetchedAt = Date.now()
      const warning =
        failures.length > 0
          ? `Bazı canlı TLE akışları güncellenemedi; son geçerli veri korunuyor. ${failures.join(' | ')}`
          : null
      apply(feeds, 'live', fetchedAt, warning)
      if (failures.length === 0) {
        try {
          await cacheSet({ key: CACHE_KEY, texts: feeds, fetchedAt })
        } catch (error) {
          setState((current) => ({
            ...current,
            warning: `Canlı veri yüklendi ancak yerel TLE önbelleği güncellenemedi: ${error instanceof Error ? error.message : String(error)}`,
          }))
        }
      }
    } catch (error) {
      setState((current) => ({
        ...current,
        warning: `Canlı TLE güncellemesi başarısız; son geçerli veri kullanılıyor. ${error instanceof Error ? error.message : String(error)}`,
      }))
    } finally {
      busyRef.current = false
    }
  }, [apply, loadSnapshots])

  const initialLoad = useCallback(async () => {
    const gen = ++genRef.current
    const isStale = () => genRef.current !== gen

    // 1. snapshots first — the globe must appear within ~2 seconds
    try {
      const feeds = await loadSnapshots()
      if (isStale()) return
      apply(feeds, 'snapshot', Date.now())
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
      if (cached && Date.now() - cached.fetchedAt < TLE_TTL_MS) {
        if (isStale()) return
        apply(cached.texts, 'cached', cached.fetchedAt)
      }
    } catch (error) {
      setState((current) => ({
        ...current,
        warning: `Yerel TLE önbelleği okunamadı; paketlenmiş veri kullanılıyor. ${error instanceof Error ? error.message : String(error)}`,
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
