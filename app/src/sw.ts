/// <reference lib="webworker" />
export {}

declare const self: ServiceWorkerGlobalScope

const APP_SHELL_CACHE = 'astrobender-shell-v1'

// vite-plugin-pwa's injectManifest strategy replaces this literal with the
// real array of { url, revision } entries for the built app shell.
// @ts-expect-error injected by vite-plugin-pwa at build time
const PRECACHE_MANIFEST: { url: string; revision: string | null }[] = self.__WB_MANIFEST

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE)
      await cache.addAll(PRECACHE_MANIFEST.map((entry) => entry.url))
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith('astrobender-shell-') && key !== APP_SHELL_CACHE)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

const TEXTURE_CACHE = 'astrobender-textures-v1'

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // Cross-origin requests (NASA/USGS/NOAA/JPL live-data APIs) pass straight
  // through — they already have their own app-level stale-cache fallback.
  if (url.origin !== self.location.origin) return
  if (!url.pathname.includes('/textures/')) return

  event.respondWith(
    (async () => {
      const cache = await caches.open(TEXTURE_CACHE)
      const cached = await cache.match(event.request)
      if (cached) return cached
      const response = await fetch(event.request)
      if (response.ok) await cache.put(event.request, response.clone())
      return response
    })(),
  )
})
