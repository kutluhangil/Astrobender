import { useCallback, useEffect, useRef, useState } from 'react'

export type PrepareOfflineStatus = 'idle' | 'loading-manifest' | 'downloading' | 'done' | 'error'

export interface PrepareOfflineState {
  status: PrepareOfflineStatus
  done: number
  total: number
  totalBytes: number | null
  error: string | null
}

interface TextureManifestEntry {
  file: string
  bytes: number
}

interface TextureManifest {
  totalBytes: number
  files: TextureManifestEntry[]
}

const MANIFEST_URL = `${import.meta.env.BASE_URL}data/texture-manifest.json`

export function usePrepareOfflineTextures() {
  const [state, setState] = useState<PrepareOfflineState>({
    status: 'idle',
    done: 0,
    total: 0,
    totalBytes: null,
    error: null,
  })
  const manifestRef = useRef<TextureManifest | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(MANIFEST_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<TextureManifest>
      })
      .then((manifest) => {
        if (cancelled) return
        manifestRef.current = manifest
        setState((prev) => ({ ...prev, totalBytes: manifest.totalBytes }))
      })
      .catch(() => {
        // Preview-only fetch failure: the button just won't show a size
        // yet. start() retries and surfaces the real error there.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const start = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      setState((prev) => ({ ...prev, status: 'error', error: 'Service worker desteklenmiyor' }))
      return
    }

    setState((prev) => ({ ...prev, status: 'loading-manifest', error: null }))

    let manifest = manifestRef.current
    if (!manifest) {
      try {
        const res = await fetch(MANIFEST_URL)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        manifest = await res.json()
        manifestRef.current = manifest
      } catch (error) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        }))
        return
      }
    }
    if (!manifest) return

    const registration = await navigator.serviceWorker.ready
    const controller = registration.active
    if (!controller) {
      setState((prev) => ({ ...prev, status: 'error', error: 'Service worker henüz aktif değil' }))
      return
    }

    const urls = manifest.files.map((f) => `${import.meta.env.BASE_URL}textures/${f.file}`)
    setState({ status: 'downloading', done: 0, total: urls.length, totalBytes: manifest.totalBytes, error: null })

    await new Promise<void>((resolve) => {
      const onMessage = (event: MessageEvent) => {
        if (event.data?.type === 'PREPARE_OFFLINE_PROGRESS') {
          setState((prev) => ({ ...prev, done: event.data.done, total: event.data.total }))
        } else if (event.data?.type === 'PREPARE_OFFLINE_COMPLETE') {
          setState((prev) => ({ ...prev, status: 'done', done: event.data.done, total: event.data.total }))
          navigator.serviceWorker.removeEventListener('message', onMessage)
          resolve()
        }
      }
      navigator.serviceWorker.addEventListener('message', onMessage)
      controller.postMessage({ type: 'PREPARE_OFFLINE_TEXTURES', urls })
    })
  }, [])

  return { state, start }
}
