# Changelog

## 2026-08-06

- Added installable PWA support: the app shell, cinematic narration, and small data files precache for offline use; the existing per-body color fallback renders the full scene with zero cached textures; viewed textures cache automatically for reuse offline; and an explicit "prepare for offline" control downloads the full 85 MB texture set on request.
- Fixed the service worker's offline handling: cached narration audio now answers Range requests with genuine 206 responses (required for Safari playback), stale app-shell cache entries are pruned on install, the offline-texture message handler validates incoming URLs, the same-origin JPL API proxy is explicitly excluded from shell caching, and install failures now log to the console before rethrowing.
- Fixed offline-mode interface issues: prepare-offline error copy is now bilingual, the offline banner shifts the identity and clock cards instead of covering them, the prepare-offline control hides behind the mobile layer sheet, the ready state can be re-run to pick up newly deployed textures, and the generated PWA icons are supersampled to remove jagged edges.
- Fixed the cinematic tour start button being unclickable on desktop, where the layer panel overlapped it.
- Hardened the prepare-offline download: its service worker message listener is torn down on unmount, and a stalled download now surfaces a retry message instead of hanging.

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
