# PWA + Offline Mode Design

## Purpose

Make ASTROBENDER installable and usable without a network connection, and
make repeat visits faster by not re-fetching unchanged app-shell and texture
assets. This must not degrade the existing scene, the existing per-source
live-data error/cache-age presentation, or add a mandatory heavy download.

## Product constraints

- Baseline offline experience (app installed, no network) must render the
  full orbital scene — Sun, planets, moons, search, cinematic tour narration
  — without requiring any texture to have downloaded.
- No automatic multi-hundred-megabyte download on first load or install.
  Texture caching beyond the offline baseline is either earned through normal
  use (cache-as-you-go) or explicitly started by the user.
- Live data sources (TLE, EONET, USGS, NOAA SWPC, JPL CAD) keep their current
  stale-cache-on-failure behavior. This feature does not replace or duplicate
  that logic — it only adds a general online/offline indicator distinct from
  the existing per-source error messages.
- Service worker registration failure must not block or degrade normal
  (non-offline) operation. It is a progressive enhancement.
- No new secret or paid dependency. One new build dependency
  (`vite-plugin-pwa`) is acceptable.

## Architecture

### Build tooling

`vite-plugin-pwa` with the `injectManifest` strategy. `generateSW` is not
used because runtime texture caching and the "prepare for offline" flow need
custom logic beyond declarative Workbox rules. The custom service worker
source lives at `app/src/sw.ts`.

### App manifest

A `manifest.json` (name, short_name "ASTROBENDER", standalone display,
existing theme colors, icon set) makes the app installable. Icons are
generated from the existing wordmark/branding as part of implementation —
no icon assets exist today.

### Precache (app shell)

Workbox precaches the built JS/CSS/HTML, the two narration MP3 files
(`public/audio/*`, ~11.7 MB total), and the small static catalog files under
`public/data/*`. This is the guaranteed offline set and stays small.

### Texture caching (cache-as-you-go)

`public/textures/*` (85 MB total, uneven resolutions per body) is **not**
precached. The offline scene baseline instead relies on the existing
solid-color material fallback already defined per body in
`src/lib/planets.ts` (the `color` field used before/without a loaded
texture) — this already renders correctly with zero texture bytes.

The service worker intercepts `/textures/*` requests with a `CacheFirst`
runtime strategy: any texture the user has actually loaded while online is
written to a dedicated cache and served from it next time, online or
offline. Bodies never visited fall back to the color placeholder, which is
the same visual the app already shows during normal lazy-loading today.

### "Prepare for offline" action

An explicit, user-triggered control (HUD settings area) that downloads the
full `public/textures/*` set into the same runtime texture cache. Before
starting, it shows the total size (85 MB, computed from a small build-time
manifest listing file names and byte sizes) and a progress indicator while
downloading. If interrupted (network drop, app closed), already-cached files
remain cached; re-running the action only fetches what's missing (`CacheFirst`
skips already-cached entries).

### Online/offline indicator

A `useOnlineStatus` hook wraps `navigator.onLine` plus `online`/`offline`
window events, exposed as a small top-level banner/badge. This is a general
connectivity indicator and is visually and logically separate from the
existing per-source warnings in the LIVE panel (e.g. TLE fetch failure,
EONET fetch failure) — those keep showing their own source/HTTP-reason
detail regardless of this banner.

### Live data sources — no change

`src/lib/tle-cache.ts` (IndexedDB) and the `useEarthObservatory.ts`
localStorage cache already fall back to the last successful payload with a
`fetchedAt` timestamp when a fetch fails. The service worker does not
intercept these third-party API origins (NASA, USGS, NOAA, JPL) — CORS and
cross-origin caching semantics make that unnecessary complexity for data
that already has an app-level stale-cache path. This feature only makes the
general offline state visible via the new banner; the existing cache-age UI
in the LIVE panel is unchanged.

## Error handling

- Service worker registration throws or is unsupported: caught, logged to
  console, app continues without offline capability. No user-facing error.
- "Prepare for offline" download fails partway (network loss): partial
  progress is kept (files already cached remain cached); the action can be
  re-run and only fetches missing files. The UI surfaces the failure reason
  (network error) rather than silently stopping.
- Texture `CacheFirst` fetch fails while online (rare — network blip):
  falls through to the existing texture-load error handling already present
  in `globe-engine.ts`; this feature does not change that path.

## Testing

- Unit test for `useOnlineStatus` (online/offline event transitions).
- Playwright e2e: service worker registers on a normal load; with
  `context.setOffline(true)` after an initial visit, the app still renders
  the baseline scene (color-placeholder bodies, working search, working
  cinematic tour trigger).
- Playwright e2e: after visiting a body online (texture cached), the same
  body renders with its real texture when offline.

## Non-goals

- Offline support for live data layers beyond their current stale-cache
  behavior (Earth Observatory imagery/globe overlay tiles, JPL CAD listings
  beyond what's already cached, etc.) is out of scope.
- Background sync / push notifications are out of scope.
