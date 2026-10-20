# GP/OMM migration and observatory completion

Date: 2026-10-20

## Why

The 2026-10-19 review found that CelesTrak's TLE format cannot carry catalog
numbers above 99999 (exhausted on 2026-07-11), so every object launched since
then is invisible. The same review listed missing observing information,
performance work, and smaller correctness gaps. This plan closes all of them.

## Order

### A. Satellite data pipeline (critical)

1. `src/lib/omm.ts`: RFC 4180 CSV parsing of CelesTrak OMM rows by header name,
   a compact serializer, and TLE-to-OMM conversion for tooling.
2. `SatInfo` carries OMM elements instead of TLE lines; the worker, Home and
   the fallback table build `SatRec`s through one `satrecFromElements` helper
   (`satellite.json2satrec`).
3. `api/tle.ts` requests `FORMAT=csv`, validates the header and row count,
   trims to the columns SGP4 needs (Vercel's 4.5 MB response cap) and returns
   `text/csv`. The IndexedDB cache key moves to `bundle-v3`.
4. Bundled snapshots become `public/data/gp-*.csv`, converted from the current
   TLE files and checked by propagating both forms to the same instant.
5. `scripts/fetch-gp-snapshots.mjs` plus a weekly workflow that opens a pull
   request; `check:sources` fails once the bundled snapshot is too old.
6. Dev server runs the real `/api/*` handlers through a Vite middleware, so dev
   and production return the same shapes.

### B. Correctness

1. Landing markers use the z-up frame the sphere geometry is rotated into;
   surface picks use `worldToLocal`.
2. Titan atmosphere wording agrees between the fact card and the profile.
3. Juno status checked against NASA.

### C. Missing information

1. Sky events: Moon phases with supermoon flag, every opposition and solar
   conjunction in the window including Uranus and Neptune, close planet pairs,
   the full IMO major-shower list.
2. Visible satellite passes for the Skywatch observer.
3. Space weather: NOAA planetary Kp and GOES X-ray flares in Earth Observatory.
4. Mission timeline: DART, Ingenuity, Chandrayaan-3, OSIRIS-REx sample return,
   Chang'e 6, Voyager 1 heliopause.
5. Lagrange occupants shown in the UI.
6. `/api/health` reports real upstream reachability.

### D. Performance

1. `React.lazy` for every panel and modal that renders conditionally.
2. Generated catalogs in their own long-lived chunk.
3. WebP re-encodes for textures where the saving is at least 20 %.

### E. Docs and governance

README, CHANGELOG, CLAUDE.md and source review dates.

## Verification

`npm run verify:ci` equivalents: unit tests, lint, `check:sources`,
`check:attributions`, build, Chromium e2e and the PWA offline suite.
