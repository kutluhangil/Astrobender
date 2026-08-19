# Astrobender

Real-time Solar System observatory: Three.js scene, live CelesTrak TLE satellites,
JPL-sourced physical profiles, bilingual (Turkish primary, English secondary) HUD, PWA.

Design direction: high-end-visual-design

HUD surfaces follow the tokens in `app/src/index.css`: `.hud-shell` (outer bezel) wrapping
`.hud-core` (inner surface), `.hud-tile` for data cells, `.hud-eyebrow` for classification
pills, `.hud-disclosure` for progressive disclosure, and one shared motion curve
(`--hud-ease`). Hairline rings replace grey borders; no webfont ships, so the type stack
stays on the platform display face and the installed PWA keeps working offline.

## Working rules

- Every celestial body, event, and numeric claim needs a primary source URL in the data
  file that defines it, plus a review date registered in `app/src/lib/source-governance.ts`.
  `npm run check:sources` fails once a dataset's review window expires.
- Errors are raised, never swallowed. Data adapters throw with the failing input, the
  response status, and the response body excerpt.
- UI copy is bilingual through `pickLanguage`; identifiers, comments, and commit messages
  stay in English.
- Verification before done: `npm run verify` from `app/` (unit tests, lint, build, e2e).
- `app/src/lib/generated/` is written by scripts, never by hand. Re-run
  `npm run generate:probe-ephemeris` and commit the result before its coverage window lapses.

## Layout

- `app/` — Vite + React + Three.js client, unit tests in `app/tests`, Playwright in `app/e2e`.
- `api/` — Vercel serverless proxies (CelesTrak TLE, JPL CAD, health).
- `app/src/lib/` — data catalogs and pure computation; `app/src/lib/globe-engine.ts` owns the scene.
