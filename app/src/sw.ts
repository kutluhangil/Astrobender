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
