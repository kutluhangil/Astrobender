/// <reference lib="webworker" />
export {}

declare const self: ServiceWorkerGlobalScope

const APP_SHELL_CACHE = 'astrobender-shell-v1'
const CURRENT_CACHES = [APP_SHELL_CACHE]

// vite-plugin-pwa's injectManifest strategy replaces this literal with the
// real array of { url, revision } entries for the built app shell.
// @ts-expect-error injected by vite-plugin-pwa at build time
const PRECACHE_MANIFEST: { url: string; revision: string | null }[] = self.__WB_MANIFEST

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(APP_SHELL_CACHE)
        await cache.addAll(PRECACHE_MANIFEST.map((entry) => entry.url))
        const wanted = new Set(
          PRECACHE_MANIFEST.map((entry) => new URL(entry.url, self.location.href).href),
        )
        for (const request of await cache.keys()) {
          if (!wanted.has(request.url)) await cache.delete(request)
        }
        await self.skipWaiting()
      } catch (error) {
        console.error('Service worker install failed — app shell not precached:', error)
        throw error
      }
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith('astrobender-') && !CURRENT_CACHES.includes(key))
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    (async () => {
      try {
        return await fetch(event.request)
      } catch {
        const cache = await caches.open(APP_SHELL_CACHE)
        const cached = await cache.match(event.request, { ignoreVary: true })
        if (cached) return cached
        if (event.request.mode === 'navigate') {
          const shellDocument = await cache.match(`${self.registration.scope}index.html`, {
            ignoreVary: true,
          })
          if (shellDocument) return shellDocument
        }
        throw new Error(`Offline and not cached: ${event.request.url}`)
      }
    })(),
  )
})
