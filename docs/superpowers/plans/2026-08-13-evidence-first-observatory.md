# Evidence-First Observatory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair ASTROBENDER's production data paths and make every scientific claim traceable to a primary source, a named calculation, or an explicitly opt-in schematic.

**Architecture:** Introduce a shared evidence contract used by static catalogs, calculated events, and live adapters. Server adapters validate upstream responses and expose actual readiness; clients preserve source timestamps and never fabricate fallback data. The existing technical HUD gains compact evidence marks and disclosures without changing its visual identity.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Three.js r185, Astronomy Engine 2.1.19, satellite.js 6, Node 24 test runner, Playwright, Vercel Functions, PWA injectManifest.

**Spec:** `docs/superpowers/specs/2026-08-13-evidence-first-observatory-design.md`

## Global Constraints

- Every explanation and user-facing product message is bilingual Turkish/English where the existing surface is bilingual; code identifiers, comments, tests, and commit messages remain English.
- No invented value, timestamp, position, classification, or silent fallback is allowed.
- Primary sources are NASA, JPL SSD/Horizons, CelesTrak, IMO, IAU, NOAA SWPC, USGS, ESA, ISRO, CNSA/CLEP, or another mission/operator source.
- `schematic` and `heuristic` content is opt-in and never presented as a scientific measurement.
- Existing last-valid data may survive a refresh error only with its original timestamp and visible failure state.
- No new runtime provider, secret, analytics service, global package, or hidden network dependency is introduced.
- Each phase updates `CHANGELOG.md`, passes `npm run verify:ci`, creates one user-authored commit, and pushes `main` before the next phase starts.

---

### Task 1: Production truth and immediate correctness

**Files:**
- Modify: `api/jpl-cad.ts`, `api/health.ts`, `vercel.json`, `app/src/hooks/useEarthObservatory.ts`, `app/src/hooks/useSmallBodies.ts`, `app/src/hooks/useTleData.ts`, `app/src/components/hud/AboutAstrobenderModal.tsx`, `app/src/lib/celestial-facts.ts`, `app/src/lib/planets.ts`, `app/scripts/production-smoke.mjs`, `app/scripts/project-integrity.test.mjs`, `app/package.json`, `CHANGELOG.md`
- Create: `app/src/lib/tle-snapshot-metadata.ts`, `app/tests/jpl-api.test.ts`, `app/tests/live-data-timestamps.test.ts`
- Test: `app/tests/health-api.test.ts`, `app/e2e/observatory.spec.ts`

**Interfaces:**
- Produces a standalone root `jpl-cad` handler with injected/testable upstream behavior and explicit `JPL_NETWORK_ERROR`, `JPL_UPSTREAM_ERROR`, and `JPL_INVALID_PAYLOAD` responses.
- Produces `/api/health` as liveness only and `/api/ready` semantics in the same handler through `?mode=ready`, returning HTTP 503 when dependency probes fail.
- Produces `TLE_SNAPSHOT_DOWNLOADED_AT` as the real packaged snapshot timestamp.

- [ ] Write failing handler tests for success, query rejection, timeout/network failure, upstream failure, and invalid JSON.
- [ ] Run `node --experimental-strip-types --test tests/jpl-api.test.ts` and confirm failures are caused by the current re-export and missing error responses.
- [ ] Implement the standalone root JPL handler and make the nested handler import or mirror only platform-neutral shared logic without a cross-package ESM re-export.
- [ ] Extend health tests so liveness never claims dependency health and readiness returns 503 with per-dependency results.
- [ ] Correct `Permissions-Policy` to `geolocation=(self)` and privacy copy to say location is requested only after the button is pressed and remains local.
- [ ] Add timestamp reducer tests proving a failed Earth/JPL refresh cannot advance `updatedAt`; implement pure state helpers used by the hooks.
- [ ] Add a packaged TLE snapshot timestamp derived from the committed snapshot acquisition and stop assigning `Date.now()` to snapshot data.
- [ ] Update Uranus to 29 moons with a direct NASA Webb source note and correct all duplicated counts.
- [ ] Extend production smoke to test JPL, readiness, security headers, manifest, service worker, and revision shape.
- [ ] Run targeted tests, then `npm run verify:ci`.
- [ ] Update `CHANGELOG.md`, commit as `fix: repair production data truth`, and push `main`.

### Task 2: Scientific truth cleanup

**Files:**
- Modify: `app/src/lib/sky-events.ts`, `app/src/lib/perseid-watch.ts`, `app/src/lib/celestial-facts.ts`, `app/src/lib/celestial-physical-profiles.ts`, `app/src/lib/orbital-mechanics.ts`, `app/src/lib/landing-sites.ts`, `app/src/lib/constellations.ts`, `app/src/lib/probes.ts`, `app/src/components/hud/ScaleSandboxModal.tsx`, `app/src/components/hud/SkywatchPanel.tsx`, `app/src/components/hud/LayerPanel.tsx`, `README.md`, `CHANGELOG.md`
- Create: `app/src/lib/meteor-calendar.ts`, `app/tests/scientific-truth.test.ts`
- Test: `app/tests/sky-events.test.ts`, `app/tests/celestial-catalog.test.ts`, `app/tests/orbital-mechanics.test.ts`, `app/tests/unified-search.test.ts`

**Interfaces:**
- Produces `METEOR_CALENDAR_BY_YEAR: Readonly<Record<number, readonly MeteorShowerRecord[]>>`; unsupported years return no guessed meteor event.
- Produces a source-required `SurfaceSite` contract.
- Removes plotted positions for probes without a source-backed ephemeris record.

- [ ] Write failing tests asserting no generic meteor events exist outside a supported annual IMO calendar and lunar eclipse start/end surround the peak correctly.
- [ ] Replace repeated month/day meteor templates with the 2026 IMO records actually supported by the reviewed calendar.
- [ ] Change the Perseid suitability number into a plainly labelled product heuristic, calculate every input at the same observation instant, and stop presenting it as a scientific score.
- [ ] Write failing consistency tests for Mercury, Europa, Titan, Ariel, Titania, Makemake, Uranus, and duplicated Scale Sandbox claims.
- [ ] Reconcile the catalog and Scale Sandbox against JPL/NASA values; replace certainty language with the source's uncertainty language.
- [ ] Correct the JPL Pluto comment and remove unreferenced dwarf-planet precision or mark the affected scene model as schematic.
- [ ] Require a primary `sourceUrl` for every surface site, add operator/mission sources, and replace “dark side” with “far side”.
- [ ] Remove unsupported constellation line figures from the default view; retain the 88-name IAU catalog and source any optional figure separately.
- [ ] Stop plotting straight-line probe estimates; keep mission cards with source-dated location text until Task 4 supplies Horizons records.
- [ ] Make synthetic asteroid/Kuiper belts default off and group them under visual aids.
- [ ] Replace README claims that all displayed values/imagery are verified with precise live/calculated/static/schematic language.
- [ ] Run targeted tests and `npm run verify:ci`.
- [ ] Update `CHANGELOG.md`, commit as `fix: remove unsupported astronomy claims`, and push `main`.

### Task 3: Field-level evidence and UI disclosure

**Files:**
- Create: `app/src/lib/scientific-evidence.ts`, `app/src/components/hud/EvidenceMark.tsx`, `app/src/components/hud/SourceDisclosureDialog.tsx`, `app/src/components/hud/SceneTruthBanner.tsx`, `app/tests/scientific-evidence.test.ts`
- Modify: `app/src/lib/celestial-catalog.ts`, `app/src/lib/celestial-physical-profiles.ts`, `app/src/lib/earth-observatory.ts`, `app/src/lib/sky-events.ts`, `app/src/lib/jpl-small-bodies.ts`, `app/src/components/hud/PlanetInfoCard.tsx`, `app/src/components/hud/EarthObservatoryPanel.tsx`, `app/src/components/hud/SkywatchPanel.tsx`, `app/src/components/hud/SmallBodiesPanel.tsx`, `app/src/components/hud/LayerPanel.tsx`, `app/src/pages/Home.tsx`, `app/src/index.css`, `app/public/data/asset-attributions.json`, `app/scripts/check-asset-attributions.mjs`, `app/scripts/check-source-freshness.mjs`, `app/scripts/project-integrity.test.mjs`, `CHANGELOG.md`

**Interfaces:**
- Produces `EvidenceClass` and `EvidenceRecord` exactly as defined by the spec.
- Produces `validateEvidenceRecord(record)` which rejects `live` without `retrievedAt`, any non-schematic record without a source, and invalid dates/URLs.
- Produces accessible evidence marks and a focus-managed source disclosure dialog.

- [ ] Write failing contract tests for each evidence class, required timestamps, source URLs, epochs, and unknown uncertainty.
- [ ] Implement evidence types, validation, bilingual labels, and freshness presentation.
- [ ] Replace the global catalog verification date with source-group evidence records and attach evidence to every selectable body's fact/profile groups.
- [ ] Add evidence to live Earth data, JPL approaches, calculated Skywatch events, TLE propagation, heuristic guidance, and schematic layers.
- [ ] Implement `EvidenceMark`, source disclosure dialog, and the persistent schematic/heuristic scene banner using the approved token/copy system.
- [ ] Add keyboard, Escape, focus-return, mobile-sheet, and reduced-motion E2E checks.
- [ ] Convert asset attribution to file-level entries with publisher, source URL, usage policy/license, retrieved date, SHA-256, and transformation notes; make manifest coverage exact.
- [ ] Make source freshness validate each evidence group rather than one editable global date.
- [ ] Run targeted tests and `npm run verify:ci`.
- [ ] Update `CHANGELOG.md`, commit as `feat: add scientific evidence records`, and push `main`.

### Task 4: Source-backed event, mission, and satellite adapters

**Files:**
- Create: `app/src/lib/celestrak-omm.ts`, `app/src/lib/horizons-records.ts`, `app/public/data/horizons-probes.json`, `app/public/data/meteor-calendar-2026.json`, `app/scripts/refresh-primary-data.mjs`, `app/tests/celestrak-omm.test.ts`, `app/tests/horizons-records.test.ts`, `app/tests/meteor-calendar.test.ts`
- Modify: `api/tle.ts`, `app/src/lib/satellites.ts`, `app/src/hooks/useTleData.ts`, `app/src/lib/probes.ts`, `app/src/lib/meteor-calendar.ts`, `app/src/lib/sky-events.ts`, `app/src/components/hud/DetailPanel.tsx`, `app/src/components/hud/SkywatchPanel.tsx`, `.github/workflows/source-review.yml`, `app/package.json`, `CHANGELOG.md`

**Interfaces:**
- Produces a CelesTrak CSV/OMM parser retaining NORAD IDs beyond five digits and a normalized record accepted by the existing SGP4 adapter.
- Produces reviewed, timestamped Horizons mission records; absent records result in an unplotted mission and an explicit unavailable position.
- Produces a deterministic primary-data refresh script that validates schemas before changing tracked JSON.

- [ ] Write failing OMM CSV tests for 5-digit and 9-digit catalog numbers, malformed headers, invalid epochs, and checksum-free normalized propagation input.
- [ ] Change the allow-listed TLE proxy to request CelesTrak CSV/OMM-compatible data and preserve cache/rate limits.
- [ ] Replace name-only satellite taxonomy with source group metadata; unknown classification stays `other`.
- [ ] Write failing Horizons tests for timestamp, coordinate frame, source URL, position vectors, and unsupported missions.
- [ ] Add a source-reviewed Horizons snapshot for plotted probes and expose its epoch/frame/limitations; do not extrapolate beyond the record.
- [ ] Store the 2026 IMO calendar as reviewed data and validate it through the refresh script; unsupported years stay empty.
- [ ] Schedule source-review validation without auto-committing unreviewed scientific changes.
- [ ] Run targeted tests and `npm run verify:ci`.
- [ ] Update `CHANGELOG.md`, commit as `feat: add source-backed astronomy adapters`, and push `main`.

### Task 5: Product, CI, accessibility, and PWA hardening

**Files:**
- Modify: `app/src/pages/Home.tsx`, `app/src/components/hud/SmallBodiesPanel.tsx`, `app/src/components/hud/EarthObservatoryPanel.tsx`, `app/src/components/hud/SkywatchPanel.tsx`, `app/src/hooks/usePropagator.ts`, `app/src/workers/propagator.worker.ts`, `app/src/lib/globe-engine.ts`, `app/src/sw.ts`, `app/src/hooks/usePrepareOfflineTextures.ts`, `app/e2e/observatory.spec.ts`, `app/e2e/pwa-offline.spec.ts`, `app/tests/performance-budget.test.ts`, `app/scripts/production-smoke.mjs`, `.github/workflows/quality.yml`, `.github/workflows/production-smoke.yml`, `.github/workflows/source-review.yml`, `.github/dependabot.yml`, `CHANGELOG.md`
- Create: `app/src/lib/panel-state.ts`, `app/tests/panel-state.test.ts`, `app/tests/propagation-diagnostics.test.ts`

**Interfaces:**
- Produces an exclusive panel state reducer and correct search-result routing.
- Produces propagation diagnostics counting failed records once and distinguishing “no valid frame” from “last valid frame retained”.
- Produces revisioned service-worker shell caches and deploy-safe activation cleanup.

- [ ] Write failing reducer tests for mutually exclusive panels and search routes to the correct tab/item.
- [ ] Implement the reducer and add tab semantics, focus entry/return, Escape close, and accessible canvas alternatives.
- [ ] Write failing worker diagnostics tests and correct failure counting/copy; add one controlled worker restart and report when no valid frame exists.
- [ ] Add JS/precache/initial-texture performance budgets and keep schematics lazy until enabled.
- [ ] Version shell caches by build revision and delete old caches only after activation; add an open-tab deploy/offline E2E.
- [ ] Add storage quota/persistence preflight and return failed offline URLs explicitly.
- [ ] Upload Playwright traces/screenshots on CI failure, pin current Node-24-compatible action revisions, and enable GitHub Actions Dependabot.
- [ ] Run production smoke automatically against the configured deployment URL after quality/deploy dispatch while retaining a manual trigger.
- [ ] Run targeted tests, `npm run verify:ci`, and production smoke against the current public alias.
- [ ] Update `CHANGELOG.md`, commit as `chore: harden observatory operations`, and push `main`.

### Task 6: Research report, roadmap, and presentation

**Files:**
- Create: `02-research/astrobender-evidence-audit-2026-08-13.md`, `docs/ASTROBENDER-Evidence-Roadmap.pptx`
- Modify: `README.md`, `CHANGELOG.md`

**Interfaces:**
- Produces a primary-source research report whose claims link directly to NASA, JPL, CelesTrak, IMO, IAU, NOAA, USGS, and mission operators.
- Produces a 10-slide Turkish technical/product deck with editable text, diagrams, citations, and a source appendix.

- [ ] Re-run primary-source research for every source family and record access date, endpoint, schema, cadence, limitations, and project mapping.
- [ ] Write the report with executive summary, architecture, corrected claims, evidence taxonomy, source registry, operations, accessibility, risks, and next opportunities.
- [ ] Build slides: product north star; current architecture; audit evidence; data classes; target architecture; interface disclosure; source adapters; phased delivery; quality evidence; source appendix.
- [ ] Render the deck, inspect every slide montage and full-size slides, and fix overlap, clipping, contrast, overflow, and citation legibility.
- [ ] Update README with the evidence model and precise runtime limitations.
- [ ] Run `npm run verify:ci`, validate every report URL, and confirm the PPTX opens and contains 10 slides.
- [ ] Update `CHANGELOG.md`, commit as `docs: publish evidence-first roadmap`, and push `main`.

## Final review

- [ ] Compare the implementation to every acceptance criterion in the design spec.
- [ ] Run a whole-branch code review focused on scientific truth, data timestamps, error paths, accessibility, source licensing, and production behavior.
- [ ] Run `npm run verify:ci` once more after all review fixes.
- [ ] Run production smoke against the public deployment and record any external account, alias, or SSO blocker without hiding it.
- [ ] Confirm `git status --short` is clean and `main` matches `origin/main`.
