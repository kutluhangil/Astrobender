// IndexedDB cache for the multi-megabyte TLE bundles (too large for
// localStorage). Keyed entries let the cache shape evolve without clashes.

import type { FeedTexts } from '@/lib/satellites'

const DB_NAME = 'leo-live'
const STORE = 'tle'

export interface CachedBundle {
  key: string
  texts: FeedTexts
  /** OMM payloads use a new cache key and an explicit format discriminator. */
  format?: 'omm-bundle-csv-v1'
  fetchedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => {
        reject(new Error(`IndexedDB "${DB_NAME}" could not be opened: ${req.error?.message ?? 'unknown error'}`))
      }
    } catch (error) {
      reject(
        new Error(
          `IndexedDB "${DB_NAME}" is unavailable: ${error instanceof Error ? error.message : String(error)}`,
        ),
      )
    }
  })
}

export async function cacheGet(key: string): Promise<CachedBundle | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => {
        const v = req.result as CachedBundle | undefined
        resolve(
          v && v.texts && typeof v.texts.active === 'string' && isFinite(v.fetchedAt)
            ? v
            : null,
        )
      }
      req.onerror = () => {
        reject(new Error(`TLE cache read failed for key "${key}": ${req.error?.message ?? 'unknown error'}`))
      }
    } catch (error) {
      reject(
        new Error(
          `TLE cache transaction could not start for key "${key}": ${error instanceof Error ? error.message : String(error)}`,
        ),
      )
    }
  })
}

export async function cacheSet(value: CachedBundle): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(value, value.key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => {
        reject(new Error(`TLE cache write failed for key "${value.key}": ${tx.error?.message ?? 'unknown error'}`))
      }
      tx.onabort = () => {
        reject(new Error(`TLE cache write was aborted for key "${value.key}": ${tx.error?.message ?? 'unknown error'}`))
      }
    } catch (error) {
      reject(
        new Error(
          `TLE cache write transaction could not start for key "${value.key}": ${error instanceof Error ? error.message : String(error)}`,
        ),
      )
    }
  })
}
