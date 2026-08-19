# Changelog

## 2026-08-19

- Reverted the source-truth batch that removed the celestial surface textures and narration audio and hid every body mesh behind a default-off schematic flag, which had left the scene showing only stars on first load.

## 2026-08-13

- Stabilized CI browser checks by probing the actual reduced-motion stylesheet and allowing measured 60-second budgets for the complete Skywatch and sourced surface-detail flows.
- Refined the celestial tray to remove passive space and added a day-selectable, source-backed Skywatch event calendar for meteor showers, eclipses, and planetary events.
- Added a source-backed Perseid Watch with the IMO 2026 active/peak window, local radiant and Moon-based astronomical score, honest weather-data boundary, reporting links, and a clearly labeled visual simulation flow.

## 2026-08-13

- Moved celestial-body navigation into a compact textured orbit tray with contextual moon popovers, and kept the layer panel focused on cosmic and Earth-satellite controls.

## 2026-08-11

- Updated the Vite/PostCSS build chain and its lockfile to resolve all current npm audit findings; CI now fails on a high-severity production dependency finding.
- Added a safe no-store readiness endpoint and a manually runnable production-smoke workflow that verifies the public shell, readiness route, and live TLE proxy without exposing credentials.
- Added mobile/desktop viewport guards, share metadata and PWA categories, plus a checked asset-attribution registry covering textures, narration, and icons.
- Added a bilingual in-product method, source, and privacy disclosure with primary-source links, explicit compressed-scale limitations, data-fetch behavior, and local-storage boundaries.
- Added browser storage visibility and a user-controlled clear action for offline textures and narration; failed offline downloads now remain visible and retryable instead of being reported as complete.
- Added an explicit catalog-source review date, in-product source freshness status, a deterministic freshness check, and a weekly GitHub Actions reminder that fails once the primary-source review window expires.
- Routed live CelesTrak feeds through an allow-listed, cacheable Vercel API; the LIVE information port now reports TLE epoch age, source fetch time, stale-orbit warnings, and counted propagation-record failures.
- Added a pinned Node 24.15 runtime, a GitHub Actions quality gate, deterministic single-worker Chromium/PWA verification commands, and strict Playwright ports so preview-server port drift cannot silently invalidate PWA tests.
- Added a bilingual Skywatch Calendar with locally calculated eclipses, meteor showers, planetary events, explicit observer selection, source links, and one-click simulation focus.

## 2026-08-06

- Added installable PWA support: the app shell, cinematic narration, and small data files precache for offline use; the existing per-body color fallback renders the full scene with zero cached textures; viewed textures cache automatically for reuse offline; and an explicit "prepare for offline" control downloads the full 85 MB texture set on request.
- Fixed the service worker's offline handling: cached narration audio now answers Range requests with genuine 206 responses (required for Safari playback), stale app-shell cache entries are pruned on install, the offline-texture message handler validates incoming URLs, the same-origin JPL API proxy is explicitly excluded from shell caching, and install failures now log to the console before rethrowing.
- Fixed offline-mode interface issues: prepare-offline error copy is now bilingual, the offline banner shifts the identity and clock cards instead of covering them, the prepare-offline control hides behind the mobile layer sheet, the ready state can be re-run to pick up newly deployed textures, and the generated PWA icons are supersampled to remove jagged edges.
- Fixed the cinematic tour start button being unclickable on desktop, where the layer panel overlapped it.
- Hardened the prepare-offline download: its service worker message listener is torn down on unmount, and a stalled download now surfaces a retry message instead of hanging.
- Fixed first-visit bandwidth contention between texture loading and the service worker precache: the two cinematic-tour narration MP3s (~11.7 MB) are no longer precached on install, instead runtime-caching like textures and downloading as part of "prepare for offline".
- Cut first-paint GPU memory from about 1.03 GB to 0.36 GB (and Moon focus from 1.43 GB to 0.49 GB) by right-sizing the single-channel Earth and Moon bump/specular/cloud/night textures, re-encoding an oversized Mercury map, and dropping anisotropic filtering on height and mask textures where it did nothing.
- Reduced continuous CPU use roughly thirteenfold at normal playback speed by propagating SGP4 every twenty wall-clock seconds instead of every two, which cubic Hermite interpolation covers to within millimetres.
- Removed wasted per-frame work from the render loop: the target callout no longer animates after it hides, the canvas rectangle is cached instead of forcing a layout every frame, satellite picking hoists its per-call constants and pauses during drags, and the asteroid belts throttle their instance updates and use an unlit material that no longer renders black.

## 2026-07-26

- Moved recoverable live-data warnings into the LIVE control's hover/focus information port, with retained technical details and retry actions.
- Fixed Vercel root builds by installing and building the nested app package explicitly, publishing `app/dist`, and exposing the JPL CAD API function at the repository root.
- Added sourced, bilingual physical profiles for every selectable planet, dwarf planet, and moon, including chemistry, mass, density, gravity, representative temperature, and explicit unknown-value handling; target callouts now fade in and dissolve after five seconds.
- Completed the observatory acceptance pass with explicit live-data cache age, independent Earth source layers, a NOAA auroral-oval overlay, full English science copy, Pluto barycentric motion, 13 additional selectable moons/dwarf planets, and a NASA Dawn Ceres surface map.
- Added Playwright browser E2E coverage, reduced-motion and keyboard-search support, visible focus states, and focus-triggered 8K Moon textures that cut the initial Moon payload by about 24 MiB.
- Added bilingual observatory navigation, unified search across satellites and science catalogs, the complete 88-entry IAU constellation catalog, and sourced Earth launch/observatory/deep-space-network surface sites.
- Added live JPL CAD close approaches, a sourced seven-object asteroid/comet catalog, expanded NASA mission status, time-aware deep-space estimates, and deterministic belts labeled as schematic.
- Added a live Earth Observatory with NASA EONET events, USGS M4.5+ earthquakes, NOAA SWPC aurora forecasts, NASA Worldview/GIBS access, explicit source errors, and globe markers.
- Added a NASA-sourced celestial catalog, Pluto–Charon and eleven major-moon models, complete moon-system point representations, and subtle rings for every giant planet.
- Controlled Earth ocean highlights without changing its textures or satellite points, cleared stale surface pins on body changes, aligned moon atmosphere facts, and removed duplicate visual assets.
- Added a temporary PriceSpawn-inspired ASTROBENDER character scramble with an alien transmission line over the opening Earth.
- Reworked the daylight space theme for high-contrast scene and HUD visibility, and replaced centered planet titles with animated off-body target callouts.
- Added an English narration track and a TR/ENG selector for the synchronized cinematic tour.
- Added the supplied Turkish narration MP3 and synchronized the cinematic tour camera cues to its real duration.
- Replaced incomplete Europa, Titania, Oberon, Triton and Pluto surface mosaics with seamless globe textures, restored mouse-driven celestial focus, and condensed the recoverable TLE warning.
- Replaced schematic circular planet and moon motion with JPL-based compressed orbital positions, corrected astronomy facts and scale labels, repaired moon orbit rendering, exposed TLE errors, unified ASTROBENDER branding, hardened security and dialog accessibility, and removed vulnerable template dependencies plus invalid unused assets.
- Replaced procedural moon renders with official USGS/JPL observation mosaics, added conservative surface tinting and irregular Mars-moon proportions, and fixed the celestial title transition lint error.
