import { useCallback, useEffect, useState } from 'react'
import { OFFLINE_RUNTIME_CACHES } from '@/lib/offline-storage'

export interface OfflineStorageState {
  supported: boolean
  usageBytes: number | null
  quotaBytes: number | null
  cachedAssetCount: number | null
  isClearing: boolean
  error: string | null
}

const INITIAL_STATE: OfflineStorageState = {
  supported: typeof window !== 'undefined' && 'caches' in window,
  usageBytes: null,
  quotaBytes: null,
  cachedAssetCount: null,
  isClearing: false,
  error: null,
}

export function useOfflineStorage() {
  const [state, setState] = useState<OfflineStorageState>(INITIAL_STATE)

  const refresh = useCallback(async () => {
    if (!('caches' in window)) {
      setState((previous) => ({ ...previous, supported: false }))
      return
    }

    try {
      const cacheKeys = await Promise.all(
        OFFLINE_RUNTIME_CACHES.map(async (cacheName) => (await caches.open(cacheName)).keys()),
      )
      const estimate = await navigator.storage?.estimate?.()
      setState((previous) => ({
        ...previous,
        supported: true,
        usageBytes: estimate?.usage ?? null,
        quotaBytes: estimate?.quota ?? null,
        cachedAssetCount: cacheKeys.reduce((total, keys) => total + keys.length, 0),
        error: null,
      }))
    } catch (error) {
      setState((previous) => ({
        ...previous,
        error: `Offline storage status could not be read: ${error instanceof Error ? error.message : String(error)}`,
      }))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const clearOfflineAssets = useCallback(async () => {
    if (!('caches' in window)) {
      setState((previous) => ({ ...previous, supported: false }))
      return
    }

    setState((previous) => ({ ...previous, isClearing: true, error: null }))
    try {
      await Promise.all(OFFLINE_RUNTIME_CACHES.map((cacheName) => caches.delete(cacheName)))
      await refresh()
    } catch (error) {
      setState((previous) => ({
        ...previous,
        error: `Offline assets could not be cleared: ${error instanceof Error ? error.message : String(error)}`,
      }))
    } finally {
      setState((previous) => ({ ...previous, isClearing: false }))
    }
  }, [refresh])

  return { state, refresh, clearOfflineAssets }
}
