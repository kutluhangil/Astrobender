/// <reference lib="webworker" />
export {}

declare const self: ServiceWorkerGlobalScope

const APP_SHELL_CACHE = 'astrobender-shell-v1'
const TEXTURE_CACHE = 'astrobender-textures-v1'
const AUDIO_CACHE = 'astrobender-audio-v1'
const CURRENT_CACHES = [APP_SHELL_CACHE, TEXTURE_CACHE, AUDIO_CACHE]

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
      // Covers every astrobender-* cache, not just the shell — a future
      // TEXTURE_CACHE version bump would otherwise strand hundreds of
      // megabytes of the old one on every existing user's device.
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

// A missing texture does not 404: the SPA rewrite serves index.html with a
// 200, which would otherwise be stored under the texture's URL and — since
// both read paths are cache-first — served as that texture forever, with no
// way to self-heal short of clearing site storage. Requiring an image
// content-type keeps a deploy/manifest mismatch from poisoning the cache.
function isCacheableTexture(response: Response): boolean {
  return response.ok && (response.headers.get('content-type') ?? '').startsWith('image/')
}

// Sibling to isCacheableTexture, same reasoning: the cinematic-tour
// narration MP3s are runtime-cached rather than precached (see
// vite.config.ts), so a deploy that drops or renames one must not let the
// SPA rewrite's 200 text/html get cached under the audio URL and served as
// "narration" forever.
function isCacheableAudio(response: Response): boolean {
  return response.ok && (response.headers.get('content-type') ?? '').startsWith('audio/')
}

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
        if (isCacheableTexture(response)) await cache.put(event.request, response.clone())
        return response
      })(),
    )
    return
  }

  // Cinematic-tour narration: cache-first, same shape as the texture
  // branch, plus Range handling — the <audio> element issues Range
  // requests (Safari requires a genuine 206 in response), and the Cache
  // API's match() ignores a query request's Range header, matching only on
  // URL. So a cache hit always returns the *full* stored response, which
  // rangeResponse() then slices down to the requested byte range.
  if (url.pathname.includes('/audio/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(AUDIO_CACHE)
        const cached = await cache.match(event.request, { ignoreVary: true })
        const rangeHeader = event.request.headers.get('range')
        if (cached) {
          if (rangeHeader) return await rangeResponse(cached, rangeHeader)
          return cached
        }
        // Cache miss: always fetch the full file rather than forwarding the
        // incoming request (which may itself carry a Range header) — caching
        // a partial response under this URL would then be served back as if
        // it were the whole file, forever, since match() ignores Range.
        const response = await fetch(event.request.url)
        if (!isCacheableAudio(response)) return response
        await cache.put(event.request.url, response.clone())
        if (rangeHeader) return await rangeResponse(response.clone(), rangeHeader)
        return response
      })(),
    )
    return
  }

  // App shell (HTML/JS/CSS/data precached at install time): network-first
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
  // Same-origin only; /textures/ for the planet/moon maps, /audio/ for the
  // cinematic-tour narration — both runtime-cached rather than precached,
  // so "prepare for offline" is what actually guarantees either works
  // offline.
  const urls = (event.data as { urls: string[] }).urls.filter((assetUrl) => {
    const parsed = new URL(assetUrl, self.location.href)
    return (
      parsed.origin === self.location.origin &&
      (parsed.pathname.includes('/textures/') || parsed.pathname.includes('/audio/'))
    )
  })
  const client = event.source as Client | null

  event.waitUntil(
    (async () => {
      const textureCache = await caches.open(TEXTURE_CACHE)
      const audioCache = await caches.open(AUDIO_CACHE)
      let done = 0
      let failureCount = 0
      for (const assetUrl of urls) {
        const isAudio = new URL(assetUrl, self.location.href).pathname.includes('/audio/')
        const cache = isAudio ? audioCache : textureCache
        const isCacheable = isAudio ? isCacheableAudio : isCacheableTexture
        try {
          const existing = await cache.match(assetUrl, { ignoreVary: true })
          if (!existing) {
            const response = await fetch(assetUrl)
            if (isCacheable(response)) await cache.put(assetUrl, response)
            else failureCount += 1
          }
        } catch (error) {
          failureCount += 1
          console.error(`Offline asset download failed: ${assetUrl}`, error)
        }
        done += 1
        client?.postMessage({ type: 'PREPARE_OFFLINE_PROGRESS', done, total: urls.length })
      }
      client?.postMessage({ type: 'PREPARE_OFFLINE_COMPLETE', done, total: urls.length, failureCount })
    })(),
  )
})
