# ASTROBENDER Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ASTROBENDER release-safe by adding repeatable quality gates, truthful live-data freshness, reliable offline controls, production observability, privacy disclosure, and cross-browser visual regression coverage without changing the Earth scene's visual language.

**Architecture:** Keep the Vite/React/WebGL application and its static-first design. Move TLE aggregation behind a fixed same-origin Vercel Function with CDN caching; expose typed source freshness in the existing non-blocking LIVE information port. Use GitHub Actions and Vercel for delivery, while additions remain compact HUD controls.

**Tech Stack:** React 19, TypeScript, Vite PWA/Workbox, Three.js, satellite.js, Playwright, Node 24, GitHub Actions, Vercel Functions.

## Global Constraints

- Preserve the Earth render, satellite points, focus behavior, and dark/light theme character.
- Keep astronomy claims source-linked; display source age and never call unavailable data live.
- Do not add external SDKs or hard-code secrets.
- Pin Node/npm compatibility; CI uses the pinned runtime.
- Recoverable source failures stay in the LIVE information port with retry and diagnostics.
- Every phase ends with fresh verification, commit, and push to `main`.
- Honour `prefers-reduced-motion`.

---

### Task 1: Deterministic runtime and CI quality gates

**Files:** Create `.github/workflows/quality.yml`, `.nvmrc`; modify `app/package.json`, `app/playwright.config.ts`, `app/scripts/project-integrity.test.mjs`, `CHANGELOG.md`.

**Produces:** `npm run verify:ci` and a GitHub Actions quality gate.

- [ ] Write failing integrity tests for `.nvmrc` and workflow coverage:
  ```js
  assert.match(readFileSync(root('.nvmrc'), 'utf8'), /^24\./)
  assert.match(readFileSync(root('.github/workflows/quality.yml'), 'utf8'), /npm run verify:ci/)
  ```
- [ ] Run `node --experimental-strip-types --test scripts/project-integrity.test.mjs`; confirm it fails.
- [ ] Add `engines: { node: ">=24.15.0 <25", npm: ">=11" }`, a `verify:ci` script, Actions checkout/setup-node/npm-ci/Playwright Chromium install/full verification.
- [ ] Make the PWA `vite preview` lifecycle explicit; run `./node_modules/.bin/playwright test --project=chromium-pwa-build --workers=1` and the CI script.
- [ ] Update changelog, run fresh verification, commit `ci: add deterministic quality gates`, and push.

### Task 2: TLE freshness and same-origin source isolation

**Files:** Create `api/tle.ts`, `app/src/lib/tle-freshness.ts`, `app/tests/tle-freshness.test.ts`; modify `app/src/hooks/useTleData.ts`, `app/src/components/hud/TimeController.tsx`, `app/src/pages/Home.tsx`, `app/e2e/observatory.spec.ts`, `vercel.json`, `CHANGELOG.md`.

**Produces:** `GET /api/tle?feed=<allow-listed-feed>` with CDN caching and `describeTleFreshness(dataset, now)`.

- [ ] Write tests:
  ```ts
  assert.equal(describeTleFreshness({ epochMs: now - 3 * DAY, source: 'live' }, now).severity, 'fresh')
  assert.equal(describeTleFreshness({ epochMs: now - 20 * DAY, source: 'snapshot' }, now).severity, 'stale')
  ```
- [ ] Implement an allow-list, ten-second upstream timeout, actionable HTTP errors, and `public, s-maxage=900, stale-while-revalidate=3600`.
- [ ] Replace direct CelesTrak browser calls with the API route while retaining snapshot/IndexedDB paths.
- [ ] Count malformed/failed orbital records instead of silently hiding them; show source, fetch time, TLE epoch age and stale state in LIVE.
- [ ] Run targeted/full tests, update changelog, commit `feat: add cached TLE freshness telemetry`, and push.

### Task 3: Scientific data governance

**Files:** Create `app/src/lib/source-governance.ts`, `app/tests/source-governance.test.ts`, `app/scripts/check-source-freshness.mjs`, `.github/workflows/source-review.yml`; modify `app/src/lib/celestial-catalog.ts`, `app/src/components/hud/PlanetInfoCard.tsx`, `app/scripts/project-integrity.test.mjs`, `CHANGELOG.md`.

**Produces:** `getCatalogFreshness(now)` and `npm run check:sources`, failing at 120 days rather than silently presenting obsolete review metadata.

- [ ] Test current, overdue, and malformed catalogue dates.
- [ ] Centralize verification metadata; add a compact source-as-of row to physical profile cards.
- [ ] Add a weekly scheduled workflow that validates freshness but never changes scientific values automatically.
- [ ] Run data tests/script/full verification, commit `feat: add scientific data freshness governance`, and push.

### Task 4: Offline storage awareness and cleanup

**Files:** Create `app/src/lib/offline-storage.ts`, `app/tests/offline-storage.test.ts`; modify `app/src/hooks/usePrepareOfflineTextures.ts`, `app/src/components/hud/PrepareOfflineControl.tsx`, `app/src/sw.ts`, `app/e2e/pwa-offline.spec.ts`, `CHANGELOG.md`.

**Produces:** capacity-aware preparation and the `CLEAR_OFFLINE_ASSETS` / `OFFLINE_ASSETS_CLEARED` service-worker protocol.

- [ ] Test quota states and cache-clear messages:
  ```ts
  assert.equal(getOfflineStorageEstimate({ quota: 40, usage: 30 }, 20).state, 'insufficient')
  ```
- [ ] Use `navigator.storage.estimate()`, disclose download size/available space, and preserve retryable errors.
- [ ] Add an accessible, explicit `Çevrimdışı verileri temizle` action that removes texture/audio caches.
- [ ] Cover prepare, clear and offline re-entry in PWA E2E.
- [ ] Run PWA/full verification, commit `feat: add offline storage management`, and push.

### Task 5: Privacy, methodology, and source transparency

**Files:** Create `app/src/components/hud/TrustModal.tsx`; modify `app/src/components/hud/IdentityBlock.tsx`, `app/src/pages/Home.tsx`, `app/src/index.css`, `app/e2e/observatory.spec.ts`, `README.md`, `CHANGELOG.md`.

**Produces:** a focus-trapped, bilingual `TrustModal` with privacy, methodology, and source tabs.

- [ ] Add an E2E test that opens disclosure, finds opt-in/local geolocation text, and closes with Escape.
- [ ] Implement using `useDialogFocus`, the existing dark/cyan materials and a compact HUD entry—no marketing overlay.
- [ ] Explain browser-local location storage, each remote source, and compressed visual distances with direct source links.
- [ ] Verify desktop/mobile keyboard behavior and reduced motion; commit `feat: add privacy and methodology disclosure`, and push.

### Task 6: Visual/device regression and public metadata

**Files:** Create `app/e2e/visual-regression.spec.ts` and approved snapshot baselines; modify `app/playwright.config.ts`, `app/index.html`, `README.md`, `CHANGELOG.md`; create `LICENSE`.

**Produces:** deterministic Earth/Europa/Pluto visual checks plus canonical/Open Graph/robots metadata and a repository license.

- [ ] Write visual tests that disable decorative motion, wait for canvas visibility, and mask volatile HUD regions:
  ```ts
  await expect(page).toHaveScreenshot('europa-focus.png', { animations: 'disabled', mask: [page.locator('[data-volatile-clock]')] })
  ```
- [ ] Generate and inspect approved baselines; require Chromium visual checks and a WebKit keyboard/dialog smoke project in CI.
- [ ] Add canonical, Open Graph, robots metadata, and an explicit owner-selected license.
- [ ] Run visual and CI-compatible tests; commit `test: add visual and device release coverage`, and push.

### Task 7: Provision monitoring and release smoke verification

**Files:** Modify `README.md`, `CHANGELOG.md`, `.github/workflows/quality.yml`.

**Produces:** a real Vercel Marketplace monitoring/observability integration and CI smoke assertions for root, security headers and `/api/jpl-cad`.

- [ ] Discover `monitoring` and `observability` through `vercel integration categories` and `vercel integration discover --category <slug>`.
- [ ] Provision the top relevant result with `vercel integration add <name> --yes --no-claim`. If account claiming is required, retain exact handoff; do not fabricate telemetry.
- [ ] Pull only environment-variable names, follow generated provider guidance, and verify no secret is committed.
- [ ] Add CI production-smoke assertions and a deployment-health artifact.
- [ ] Inspect deployment logs after push, update runbook/changelog, commit `ops: add production observability gate`, and push.

## Plan Coverage Review

- CI and PWA reliability: Tasks 1 and 4.
- TLE resilience, epoch age and malformed-record diagnostics: Task 2.
- Catalog data currency: Task 3.
- Offline storage clarity/cleanup: Task 4.
- Privacy and third-party-source transparency: Task 5.
- Visual regression, Safari-adjacent smoke, SEO and licence: Task 6.
- Error/uptime monitoring and production smoke verification: Task 7.

## Execution Order

Execute Tasks 1–7 sequentially. Each task is one phase and ends with its specified fresh verification, commit, and push before the next phase begins.
