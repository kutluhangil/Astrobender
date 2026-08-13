import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchJplCloseApproaches,
  type CloseApproach,
} from '@/lib/jpl-small-bodies'
import { reduceSmallBodyRefreshFailure } from '@/lib/tle-snapshot-metadata'

interface SmallBodyState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  approaches: CloseApproach[]
  error: string | null
  updatedAt: number | null
}

const INITIAL_STATE: SmallBodyState = {
  status: 'idle',
  approaches: [],
  error: null,
  updatedAt: null,
}

export function useSmallBodies(enabled: boolean) {
  const [state, setState] = useState<SmallBodyState>(INITIAL_STATE)
  const generationRef = useRef(0)
  const controllerRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    const generation = ++generationRef.current
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const timeoutId = window.setTimeout(() => controller.abort(), 12000)
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const approaches = await fetchJplCloseApproaches(controller.signal)
      if (generationRef.current !== generation) return
      setState({
        status: 'ready',
        approaches,
        error: null,
        updatedAt: Date.now(),
      })
    } catch (error) {
      if (generationRef.current !== generation) return
      const message = error instanceof DOMException && error.name === 'AbortError'
        ? 'JPL CAD request timed out after 12000 ms'
        : error instanceof Error ? error.message : String(error)
      setState((current) => reduceSmallBodyRefreshFailure(current, message))
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
