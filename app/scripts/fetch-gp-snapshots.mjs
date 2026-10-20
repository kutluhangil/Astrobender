/**
 * Refreshes the bundled CelesTrak GP snapshots in public/data from the OMM CSV
 * endpoint. The app paints from these files before the live proxy answers and
 * falls back to them offline, so they must not drift months behind: SGP4 error
 * grows to tens of kilometres within weeks for low orbits.
 *
 * OMM, not TLE: the TLE catalog field holds five characters and the catalog
 * passed 99999 on 2026-07-11, so TLE output silently omits newer objects.
 *
 *   npm run generate:gp-snapshots
 *
 * CelesTrak asks clients not to download the same group more than once per
 * update cycle (about two hours); this script runs weekly from CI.
 */
import { writeFileSync } from 'node:fs'
import { parseOmmCsv, serializeOmmCsv } from '../src/lib/omm.ts'

const GROUPS = [
  { group: 'active', file: 'gp-active.csv', minimum: 1000 },
  { group: 'visual', file: 'gp-visual.csv', minimum: 50 },
  { group: 'cosmos-2251-debris', file: 'gp-cosmos-2251-debris.csv', minimum: 50 },
  { group: 'iridium-33-debris', file: 'gp-iridium-33-debris.csv', minimum: 20 },
  { group: 'fengyun-1c-debris', file: 'gp-fengyun-1c-debris.csv', minimum: 200 },
]

const outputs = []
for (const { group, file, minimum } of GROUPS) {
  const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=csv`
  const response = await fetch(url, {
    headers: { Accept: 'text/csv', 'User-Agent': 'ASTROBENDER/1.0 (snapshot refresh)' },
    signal: AbortSignal.timeout(60_000),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status} ${response.statusText}: ${text.replace(/\s+/g, ' ').slice(0, 300)}`)
  }
  const { records, skipped } = parseOmmCsv(text)
  if (records.length < minimum) {
    throw new Error(`${url} returned ${records.length} usable element sets, expected at least ${minimum}`)
  }
  records.sort((left, right) => left.norad - right.norad)
  outputs.push({ file, csv: serializeOmmCsv(records), count: records.length, skipped })
  // Space requests out instead of hitting CelesTrak five times at once.
  await new Promise((resolve) => setTimeout(resolve, 2000))
}

// Write only after every group succeeded, so a partial outage never leaves a
// mixed-age set of snapshots behind.
for (const { file, csv, count, skipped } of outputs) {
  writeFileSync(new URL(`../public/data/${file}`, import.meta.url), csv)
  console.log(`${file}: ${count} element sets${skipped ? `, ${skipped} malformed rows skipped` : ''}`)
}
