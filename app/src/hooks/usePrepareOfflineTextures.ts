import { useCallback, useState } from 'react'

export type PrepareOfflineStatus = 'idle' | 'done' | 'error'

export interface PrepareOfflineState {
  status: PrepareOfflineStatus
  done: number
  total: number
  totalBytes: number | null
  failureCount: number
  error: string | null
}

export const ERROR_SW_UNSUPPORTED = 'sw-unsupported'
export const ERROR_SW_NOT_ACTIVE = 'sw-not-active'

const INITIAL_STATE: PrepareOfflineState = {
  status: 'idle',
  done: 0,
  total: 0,
  totalBytes: 0,
  failureCount: 0,
  error: null,
}

// Runtime imagery and narration are intentionally not packaged without exact
// provenance. The service worker still caches the app shell;
// this hook preserves the offline-control contract without claiming a media
// download that does not exist.
export function usePrepareOfflineTextures() {
  const [state, setState] = useState<PrepareOfflineState>(INITIAL_STATE)

  const start = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      setState({ ...INITIAL_STATE, status: 'error', error: ERROR_SW_UNSUPPORTED })
      return
    }

    const registration = await navigator.serviceWorker.ready
    if (!registration.active) {
      setState({ ...INITIAL_STATE, status: 'error', error: ERROR_SW_NOT_ACTIVE })
      return
    }

    setState({ ...INITIAL_STATE, status: 'done' })
  }, [])

  return { state, start }
}
