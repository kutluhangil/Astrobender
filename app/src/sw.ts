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
      try {
        const cache = await caches.open(APP_SHELL_CACHE)
        await cache.addAll(PRECACHE_MANIFEST.map((entry) => entry.url))

        // Prune stale entries left behind by previous deploys: the
        // `activate` listener only deletes caches with a *different name*,
        // so hashed build assets from earlier builds would otherwise
        // accumulate forever inside this one cache.
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
          .filter((key) => key.startsWith('astrobender-shell-') && key !== APP_SHELL_CACHE)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

const TEXTURE_CACHE = 'astrobender-textures-v1'

// Builds a 206 Partial Content response from a cached full response, for a
// single-range `Range` header (`bytes=start-end` or `bytes=start-`). Chrome
// and Safari issue range requests for <audio>/<video> elements — Safari in
// particular refuses to play back media served with anything but a genuine
// 206 for these requests, so a cache that only ever returns full 200s is
// silently broken for offline narration playback. Multi-range requests
// (`bytes=0-10,20-30`) aren't supported: nothing in this app issues them.
async function rangeResponse(cached: Response, rangeHeader: string): Promise<Response> {
  const body = await cached.clone().arrayBuffer()
  const totalLength = body.byteLength

  const match = /^bytes=(\d+)-(\d+)?$/.exec(rangeHeader)
  const start = match ? Number(match[1]) : 0
  const end = match && match[2] !== undefined ? Number(match[2]) : totalLength - 1
  const clampedEnd = Math.min(end, totalLength - 1)

  const slice = body.slice(start, clampedEnd + 1)

  const headers = new Headers(cached.headers)
  headers.set('Content-Range', `bytes ${start}-${clampedEnd}/${totalLength}`)
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Content-Length', String(slice.byteLength))

  return new Response(slice, {
    status: 206,
    statusText: 'Partial Content',
    headers,
  })
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // Cross-origin requests (NASA/USGS/NOAA/JPL live-data APIs) pass straight
  // through — they already have their own app-level stale-cache fallback.
  if (url.origin !== self.location.origin) return

  // Live-data API proxy: never intercept, even though it's same-origin —
  // this must always hit the network so it never serves stale JPL data.
  if (url.pathname.startsWith('/api/')) return

  if (url.pathname.includes('/textures/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(TEXTURE_CACHE)
        const cached = await cache.match(event.request, { ignoreVary: true })
        if (cached) return cached
        const response = await fetch(event.request)
        if (response.ok) await cache.put(event.request, response.clone())
        return response
      })(),
    )
    return
  }

  // App shell (HTML/JS/CSS/audio/data precached in Task 3): network-first
  // so online users always get the latest build, falling back to the
  // precache when the network is unavailable. Navigation requests (e.g. a
  // reload at "/") fall back to the precached start_url document.
  event.respondWith(
    (async () => {
      try {
        return await fetch(event.request)
      } catch {
        const cache = await caches.open(APP_SHELL_CACHE)
        // ignoreVary: the preview/dev server sends `Vary: Origin` on every
        // static asset, but ES-module script/style requests carry an
        // Origin header that the service worker's own install-time
        // `cache.addAll()` fetch didn't — a spurious Vary mismatch against
        // an origin-conditional response header (ACAO) neither of these
        // same-origin assets' actual bytes ever vary on.
        const cached = await cache.match(event.request, { ignoreVary: true })
        if (cached) {
          const rangeHeader = event.request.headers.get('range')
          if (rangeHeader) return await rangeResponse(cached, rangeHeader)
          return cached
        }
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

self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'PREPARE_OFFLINE_TEXTURES') return
  const urls = (event.data as { urls: string[] }).urls.filter((textureUrl) => {
    const parsed = new URL(textureUrl, self.location.href)
    return parsed.origin === self.location.origin && parsed.pathname.includes('/textures/')
  })
  const client = event.source as Client | null

  event.waitUntil(
    (async () => {
      const cache = await caches.open(TEXTURE_CACHE)
      let done = 0
      for (const textureUrl of urls) {
        try {
          const existing = await cache.match(textureUrl, { ignoreVary: true })
          if (!existing) {
            const response = await fetch(textureUrl)
            if (response.ok) await cache.put(textureUrl, response)
          }
        } catch {
          // Network drop mid-batch: leave this one uncached. Already-cached
          // entries are preserved, and re-running the action later only
          // fetches what's still missing.
        }
        done += 1
        client?.postMessage({ type: 'PREPARE_OFFLINE_PROGRESS', done, total: urls.length })
      }
      client?.postMessage({ type: 'PREPARE_OFFLINE_COMPLETE', done, total: urls.length })
    })(),
  )
})
