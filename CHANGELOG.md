# Changelog

## 2026-10-20

- Moved the satellite catalogue from TLE to CelesTrak's OMM CSV. The TLE catalog field holds five characters and the catalog passed 99999 on 2026-07-11, so every object launched since then had been silently missing. The proxy compacts the CSV to the columns SGP4 needs to stay under Vercel's 4.5 MB response cap, the client parses rows by header name, and SGP4 starts from `json2satrec`; converting the bundled snapshots propagated all 18,841 objects to within 4 m of their TLE positions.
- Added a weekly `GP snapshot refresh` workflow and `npm run generate:gp-snapshots`; `check:sources` now fails once the bundled snapshot's median epoch is older than 120 days.
- Dev and preview servers now answer `/api/*` with the same handlers Vercel deploys instead of proxying raw upstream payloads.
- `/api/health` now probes CelesTrak (a HEAD on its home page, never a GP download) and JPL, and reports `degraded` with per-upstream detail instead of a static `configured`.
- Skywatch now lists Moon phases with NASA-defined supermoons, every opposition and solar conjunction in the window (Uranus and Neptune included, inferior and superior conjunctions for Mercury and Venus), naked-eye planet pairs closer than 1.5°, and all twelve major IMO showers. Shower maxima are computed each year from the IMO J2000 solar longitudes and match the 2026 and 2027 IMO calendars on every date; each event states ZHR, activity window, Moon illumination and, for a saved location, the best radiant altitude in darkness.
- Perseid Watch now follows the season: after the 2026 activity it shows the 2027 return with the IMO 08–10 UT window and ZHR 110+.
- Added visible ISS and Tiangong passes for the Skywatch location: rise, culmination and set directions, the sunlit-and-dark span, and a jump to the culmination in the scene. Element sets older than 14 days are refused rather than shown with drifted times.
- Added NOAA space weather to Earth Observatory: the latest planetary Kp with its G level and the forecast peak, and the strongest GOES X-ray flare of the past week with its R level.
- Added DART, Ingenuity's first flight, Chandrayaan-3, the OSIRIS-REx sample return, Chang'e 6 and Voyager 1's heliopause crossing to the mission timeline, with Chandrayaan-3 and Chang'e 6 landing sites.
- Added 2P/Encke, the Taurid parent, as a fourth comet; its two-body track sits 0.002 au from Horizons and reaches perihelion on 2027-02-10.
- Listed the spacecraft at Sun-Earth L1 and L2 in the Lagrange disclosure, and removed Gaia, which left L2 when it was retired in March 2025.
- Marked Juno's extended mission as ended in September 2025, as NASA states.
- Fixed landing markers drawn in a y-up frame on z-up spheres, and surface picks that subtracted a body's position twice.
- Lazy-loaded every panel and modal and split astronomy-engine and the generated catalogues into their own chunks: the main bundle fell from 861 kB to 338 kB (290 to 107 kB gzipped). Skywatch's 90-day event list is computed in idle time.
- Re-encoded eight textures as WebP where it saved at least 20 % at above 43 dB PSNR, cutting 4.3 MB from the texture set.
- Stopped Tailwind from scanning the generated catalogue tables, whose megabyte-long lines sent its class extractor into minutes of regex backtracking: the production build fell from 76 s (over 15 minutes on a loaded machine) to 3 s with byte-identical CSS.
- Kept a panel chunk that fails to load inside an error boundary with a reload action instead of unmounting the globe.
- Reported malformed element rows per feed, kept the previous set when a live feed arrives with under half its rows, and deleted the retired TLE cache entry from IndexedDB.
- Cut visible-pass prediction to about 30 ms per station by evaluating the Sun once per pass, and shared one ephemeris sample per planet across all ten planet-pair scans.
- Meteor notes now distinguish a sky that never gets dark at high latitude from a radiant below the horizon, and a radiant under 15° is no longer called visible.

## 2026-10-19

- Corrected the moon counts to NASA's August 2026 figures: Jupiter 115, Saturn 293, Uranus 29.
- Fixed the NOAA aurora parser, which dropped every forecast cell east of 180°, i.e. the whole Americas.
- Fixed local solar-eclipse visibility, which searched from the global peak and skipped the eclipse it described: the 2026-08-12 total eclipse now shows as visible from Reykjavik and Madrid. Lunar eclipses no longer end one penumbral semi-duration too late.
- Fixed satellite layers: AISSAT, SWISSCUBE and "OUTPOST MISSION" were stations, ISRO's GSAT satellites were Galileo, and ARSAT was weather.
- Aligned the physical profiles with the JPL planetary and satellite tables (Uranus gravity, Ceres, Eris, the Uranian moons from URA111, Amalthea, Janus, Epimetheus and others) and filled Makemake, Himalia, Pan, Nix, Hydra, Metis and Thebe from published GM values.
- Labelled Quaoar, Gonggong and Sedna as dwarf-planet candidates, gave the small-body catalogue and mission statuses English text, and removed Turkish fragments from English body values.
- Estimated a size range from absolute magnitude for the close approaches JPL publishes without a diameter, and made the JPL CAD proxy report timeouts and empty windows instead of crashing.
- Gave irregular and chaotic moons their measured spin periods, fixed Huygens' longitude convention, and made landing sites stored on 0–360° findable from picks.

## 2026-08-20

- Added an observation planner to Skywatch: pick one of the nine plannable bodies and it plans tonight from the saved location — the longest stretch that is both astronomically dark and above the 20° altitude floor, the exact culmination and its compass bearing, apparent magnitude, and how close a lit Moon sits to the target.
- Drew that plan as an altitude curve across the night, with astronomical darkness shaded behind it, the horizon and the 20° floor as hairlines, a crosshair readout on hover and keyboard focus, and an hourly table so no value is reachable only by pointing.
- Told the midnight sun and the polar night apart, which a sunset search alone cannot do: at 78°N in December the planner now reports one fifteen-hour dark window instead of no night at all.
- Gave every surface texture a distance-based level of detail: a body loads its full-resolution map only when it is focused or on screen and nearby, and releases it back to the procedural preview once the camera is far away. A visit to Mars now costs 171 MiB of GPU memory and gives it back on leaving, where before every body toured stayed resident for the session.
- Reported resident close-range texture memory in the LIVE status port, alongside the satellite thinning already shown there.
- Replaced the single catalog review date with a per-dataset registry: thirteen datasets each carry their own primary source, review date, review window and a stated reason for that window, so the frozen Yale star catalogue is not chased every 120 days while the yearly IMO shower calendar is.
- Made `npm run check:sources` walk that registry instead of grepping one constant, and fail as well when the baked Horizons probe ephemeris drops below 180 days of remaining coverage.
- Replaced the 1,400 procedurally scattered dots with the real sky: all 8,404 stars of the Yale Bright Star Catalogue down to magnitude 6.5, placed by their J2000 equatorial coordinates, coloured from their B-V index and sized by visual magnitude.
- Put the stars and the 88 constellation figures on one celestial sphere that rides with the camera, so the widest zoom-out no longer leaves the viewpoint outside its own sky or lets an outer body fall behind the stars.
- Corrected the constellation layer's caption, which still claimed five representative figures after all 88 had been resolved, and gave the star field its own catalogue citation.

## 2026-08-19

- Added a mission timeline: eighteen NSSDCA-sourced moments from Apollo 11 to Zhurong, grouped by decade, each of which sets the simulation clock to its instant, focuses the target body, and pins the surface site it landed on.
- Replaced the linear probe-distance estimate with real JPL Horizons vectors baked at build time by `npm run generate:probe-ephemeris`: all seven deep-space missions now plot from their own solution, Parker Solar Probe and Juno sample densely enough for their tight orbits, and a simulation time outside a mission's window hides its marker instead of extrapolating a path it never flew.
- Added a Lagrange and Trojan layer: Sun-Earth and Sun-Jupiter L4/L5 sit at their true 60° positions, L1 and L2 use the third-order Hill series (1.4915 and 1.5015 million km) and are drawn at a disclosed exaggeration because the compressed scale would bury them inside the Earth, and the two Jupiter Trojan camps are labelled schematic libration clouds rather than catalogued positions.
- Added a comet layer: 1P/Halley, 67P/Churyumov-Gerasimenko, and 12P/Pons-Brooks draw their real eccentric orbits from JPL SBDB elements, with fixed-size markers because a few-kilometre nucleus cannot be drawn to scale, and each entry states how far its two-body track drifts from JPL Horizons.
- Explicitly opened right-hand panels now outrank the ambient body panel, which had been intercepting clicks on the small-body and Earth Observatory panels beneath it.
- Added a compressed-AU scale-honesty ruler to the body panel: two bars on one axis compare the true orbit with the drawn one and state the percentage the scene is squeezing.
- Added a terminator and local-time readout for Earth — apparent solar time, Sun altitude, day/night side, and the subsolar point — cited to the NOAA solar calculator.
- Thinned the satellite shell to 28% of its records as the camera closes on a body so the surface stays readable, and reported the reduction in the LIVE status port instead of dropping records silently.
- Scaled camera transitions by how far the camera actually travels and made them instant under `prefers-reduced-motion`, which the engine now tracks live rather than reading once at startup.
- Rebuilt the body panel around the recorded `high-end-visual-design` direction: three signature values with Earth comparisons lead, orbit, physical profile, and ring data move behind disclosures, and every citation collects into one source strip.
- Added a shared HUD token layer — nested shell/core bezels, hairline rings, concentric radii, and one motion curve — and dropped the unloaded Inter reference for the platform display face.
- Reserved the bottom-right HUD corner in the body-panel placement so a fully expanded panel no longer runs under the offline-storage control.
- Bound the live JPL close-approach feed to the named small-body catalog: rows now resolve to a catalogued body, sort into a genuine upcoming window, report lunar distances, and can move the simulation clock to the approach date or focus the modelled body.
- Expanded the named small-body catalog to fifteen entries with SBDB designations, scene links for the nine that are modelled, and Apophis added for its 2029 pass.
- Drew Jupiter's, Uranus's, and Neptune's ring systems as their real named bands from the NASA PDS Ring-Moon Systems tables, with the ten sub-pixel Uranian rings widened to stay visible and labelled as such in the body panel.
- Added the seven missing modelled moons — Metis, Thebe, Elara, Pasiphae, Janus, Epimetheus, and Phoebe — with the distant irregulars referenced to the solar plane instead of their planet's equator.
- Added eight JPL-sourced bodies — Vesta, Pallas, Hygiea, Juno, Psyche, Quaoar, Gonggong, and Sedna — with Keplerian elements re-anchored to J2000 and pinned against JPL Horizons vectors to within 0.001 au.
- Replaced the Kepler solver's Newton iteration with a Halley step and a Danby starter so near-parabolic orbits (Sedna at e = 0.86, comets above e = 0.95) converge instead of stalling.
- Orbit lines now sample by eccentric anomaly, which keeps eccentric orbits from losing their perihelion arc to aphelion-bunched samples.
- Grouped dwarf planets, asteroids, and trans-Neptunian bodies into one celestial-tray drawer so the tray stays inside the viewport as the catalog grows.
- Recorded the project design direction (`high-end-visual-design`) and working rules in a root `CLAUDE.md`.
- Pinned the Skywatch calendar end-to-end test to a fixed clock so its event assertions no longer break as the real 90-day window drifts past them.
- Fixed the celestial tray moon popover closing while the pointer crossed the gap toward it, gave Earth its Moon entry in that popover, moved the desktop body panel next to the focused body instead of a fixed corner, and stopped the starfield from bleeding through planet surfaces.
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
