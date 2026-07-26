# ASTROBENDER Observatory Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sourced Solar System coverage, live Earth-observation layers,
real small-body data, unified search/localization, and regression protection
without changing ASTROBENDER's established default visual design.

**Architecture:** Preserve `GlobeEngine` as the rendering owner, move science
content into typed catalogs and source clients, and add optional layer
controllers around the existing default scene. Network integrations return
validated source-state objects and never mutate the base visualization.

**Tech Stack:** React 19, TypeScript 5.9, Three.js 0.185, Vite 7,
satellite.js 6, Node test runner, NASA/JPL/NOAA/USGS public services.

## Global Constraints

- Preserve the current Earth materials, camera framing, HUD design, and compact
  glowing satellite points.
- Do not add paid dependencies, secrets, analytics, or authentication.
- Do not commit generated attribution or co-author trailers.
- Run `npm test`, `npm run lint`, and `npm run build` before every phase commit.
- Update the root `CHANGELOG.md` for every implementation phase.
- Commit and push each phase separately.

---

### Task 0: Commit the approved specification and plan

**Files:**
- Create: `docs/superpowers/specs/2026-07-26-astrobender-observatory-expansion-design.md`
- Create: `docs/superpowers/plans/2026-07-26-astrobender-observatory-expansion.md`

- [ ] Review both documents for placeholders, contradictions, and missing
      requirements.
- [ ] Confirm the worktree contains only the two planning documents.
- [ ] Commit with `docs: plan observatory expansion`.
- [ ] Push `main`.

### Task 1: Repair verified visual, state, and fact defects

**Files:**
- Modify: `app/src/pages/Home.tsx`
- Modify: `app/src/lib/globe-engine.ts`
- Modify: `app/src/lib/celestial-facts.ts`
- Modify: `app/src/components/hud/ScaleSandboxModal.tsx`
- Modify: `app/scripts/project-integrity.test.mjs`
- Delete: `app/src/components/hud/CinematicTitleOverlay.tsx`
- Delete: `app/public/textures/sun-8k.jpg`
- Modify: `CHANGELOG.md`

**Interfaces:**
- `handleSelectBody(body)` clears `selectedPin` before focusing.
- Earth shader exposes bounded specular and bloom-safe highlights.
- The scale sandbox references `sun-map.jpg`.

- [ ] Add a failing integrity assertion for coordinate cleanup, the corrected
      Callisto exosphere, and the single Sun texture.
- [ ] Run the targeted test and confirm it fails.
- [ ] Clear stale pin state on body changes.
- [ ] Clamp Earth specular output so the surface remains readable.
- [ ] Correct Callisto to a thin carbon-dioxide, oxygen, and hydrogen
      exosphere; reconcile Titan values across both screens.
- [ ] Remove the unused title component and duplicate Sun texture.
- [ ] Update the changelog, run full verification, visually inspect Earth and
      three representative planets, commit, and push.

### Task 2: Centralize celestial data and complete major systems

**Files:**
- Create: `app/src/lib/celestial-catalog.ts`
- Create: `app/src/lib/celestial-sources.ts`
- Create: `app/src/lib/minor-moons.ts`
- Modify: `app/src/lib/planets.ts`
- Modify: `app/src/lib/orbital-mechanics.ts`
- Modify: `app/src/lib/globe-engine.ts`
- Modify: `app/src/components/hud/PlanetInfoCard.tsx`
- Modify: `app/src/components/hud/ScaleSandboxModal.tsx`
- Modify: `app/src/components/hud/LayerPanel.tsx`
- Modify: `app/tests/orbital-mechanics.test.ts`
- Create: `app/tests/celestial-catalog.test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**
- `CELESTIAL_CATALOG: Record<CelestialBodyId, CelestialRecord>`
- `getCelestialRecord(id): CelestialRecord`
- `MINOR_MOON_GROUPS: MinorMoonGroup[]`
- `getBarycentricScenePositions(systemId, timeMs)`

- [ ] Write catalog completeness and source-integrity tests.
- [ ] Introduce one sourced record for every existing body and remove duplicated
      physical-fact ownership.
- [ ] Add Charon, Styx, Nix, Kerberos, Hydra and Pluto-system barycentric
      motion.
- [ ] Add Miranda, Ariel, Umbriel, Mimas, Tethys, Dione, Rhea, Iapetus,
      Hyperion, Pan, Proteus, Nereid, Larissa, Amalthea, and Himalia as
      selectable schematic meshes with sourced orbital values.
- [ ] Add Ceres, Haumea, Makemake, and Eris.
- [ ] Generalize ring definitions and render faint Jupiter, Uranus, and Neptune
      rings while preserving Saturn.
- [ ] Add grouped low-cost confirmed-moon points with honest catalog labels.
- [ ] Run tests, lint, build, and visual checks at Earth, Pluto, Uranus,
      Saturn, and Jupiter; update changelog, commit, and push.

### Task 3: Add Earth Observatory data layers

**Files:**
- Create: `app/src/lib/remote-data.ts`
- Create: `app/src/lib/earth-observatory.ts`
- Create: `app/src/hooks/useEarthObservatory.ts`
- Create: `app/src/components/hud/EarthObservatoryPanel.tsx`
- Modify: `app/src/lib/globe-engine.ts`
- Modify: `app/src/pages/Home.tsx`
- Modify: `app/vercel.json`
- Create: `app/tests/earth-observatory.test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**
- `fetchJsonSource<T>(request, validator): Promise<SourceResult<T>>`
- `parseEonetEvents(payload): EarthEvent[]`
- `parseUsgsEarthquakes(payload): EarthEvent[]`
- `parseNoaaAurora(payload): AuroraPoint[]`
- `GlobeEngine.setEarthEvents(events)`
- `GlobeEngine.setAuroraOverlay(points)`

- [ ] Write payload validation tests for valid, invalid, empty, timeout, and
      HTTP-error cases.
- [ ] Implement bounded source requests and IndexedDB/local cache metadata.
- [ ] Add independent NASA EONET, USGS earthquake, and NOAA aurora controls.
- [ ] Render event markers and auroral oval only when their layers are enabled.
- [ ] Add NASA GIBS layer metadata, imagery-date control, and optional overlay
      without replacing the base Earth.
- [ ] Expose source, timestamp, age, loading, cached, and actionable error
      states.
- [ ] Update CSP connect/image sources.
- [ ] Verify default Earth is unchanged, run the complete checks, update
      changelog, commit, and push.

### Task 4: Add real small bodies and time-aware missions

**Files:**
- Create: `app/src/lib/jpl-small-bodies.ts`
- Create: `app/src/hooks/useSmallBodies.ts`
- Create: `app/src/components/hud/SmallBodiesPanel.tsx`
- Modify: `app/src/lib/probes.ts`
- Modify: `app/src/lib/asteroids.ts`
- Modify: `app/src/lib/globe-engine.ts`
- Modify: `app/src/pages/Home.tsx`
- Create: `app/tests/jpl-small-bodies.test.ts`
- Modify: `app/vercel.json`
- Modify: `CHANGELOG.md`

**Interfaces:**
- `parseCloseApproaches(payload): CloseApproach[]`
- `GlobeEngine.setSmallBodies(objects)`
- `MissionEphemeris.positionAt(timeMs): CartesianPosition`

- [ ] Add strict JPL SBDB close-approach payload tests.
- [ ] Add a selectable real near-Earth-object layer with date, distance,
      velocity, diameter, and uncertainty.
- [ ] Rename ambient random belts as schematic and seed their layout for stable
      reloads.
- [ ] Replace fixed probe offsets with time-aware ephemeris records and source
      labels; include Europa Clipper and active flagship missions.
- [ ] Add comet and named asteroid entries for Halley, 67P, Bennu, Ryugu,
      Vesta, Eros, and Ceres.
- [ ] Verify time controls move real-data objects correctly, run full checks,
      update changelog, commit, and push.

### Task 5: Unify search, surface infrastructure, constellations, and language

**Files:**
- Create: `app/src/lib/i18n.ts`
- Create: `app/src/lib/search-index.ts`
- Create: `app/src/lib/observatories.ts`
- Modify: `app/src/lib/landing-sites.ts`
- Modify: `app/src/lib/constellations.ts`
- Modify: `app/src/components/hud/SearchBox.tsx`
- Modify: all `app/src/components/hud/*.tsx` with visible copy
- Modify: `app/src/pages/Home.tsx`
- Create: `app/tests/search-index.test.ts`
- Create: `app/tests/i18n.test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**
- `t(language, key, params?)`
- `buildSearchIndex(input): SearchEntry[]`
- `SearchEntry.activate(): SearchAction`

- [ ] Write tests for Turkish/English key parity and grouped search results.
- [ ] Move HUD copy into complete typed TR/EN catalogs.
- [ ] Make the current TR/ENG selector control the entire interface and retain
      narration-language behavior.
- [ ] Search satellites, bodies, missions, sites, Earth events, and small
      bodies from one field.
- [ ] Add launch sites, ground stations, observatories, and remaining historic
      planetary landing sites.
- [ ] Expand constellation line data to the 88 IAU constellations with labels
      and a visibility-density rule.
- [ ] Run full and browser verification in both languages, update changelog,
      commit, and push.

### Task 6: Optimize assets and add browser regression coverage

**Files:**
- Create: `app/src/lib/texture-manifest.ts`
- Modify: `app/src/lib/globe-engine.ts`
- Modify: `app/vite.config.ts`
- Modify: `app/package.json`
- Create: `app/tests/browser/astrobender.spec.ts`
- Create: `app/playwright.config.ts`
- Modify: `app/scripts/project-integrity.test.mjs`
- Modify: `CHANGELOG.md`

**Interfaces:**
- `chooseTextureVariant(asset, capabilities): TextureVariant`
- Browser tests run with `npm run test:e2e`.

- [ ] Add deterministic texture-choice unit tests.
- [ ] Add 2K startup/high-resolution focus texture manifests without changing
      desktop close-up appearance.
- [ ] Defer Moon bump/specular and narration media until their feature is used.
- [ ] Add browser tests for body clicks, fly-to, stale-pin cleanup, Earth
      exposure, Observatory toggles, search, language, and source failure.
- [ ] Measure startup transfers and frame rate before/after.
- [ ] Run test, E2E, lint, build, and production preview checks; update
      changelog, commit, and push.

### Task 7: Final audit and report

- [ ] Compare every design acceptance criterion with shipped code and tests.
- [ ] Verify the deployed/local production preview in dark and light themes,
      desktop and mobile, Turkish and English.
- [ ] Record completed, intentionally schematic, and externally constrained
      items.
- [ ] Confirm git status is clean and `origin/main` equals `HEAD`.
- [ ] Deliver the final Turkish report with commit IDs and verification
      evidence.
