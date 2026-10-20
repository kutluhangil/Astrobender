/**
 * Fails the build once any dataset's review window expires, once the baked
 * probe ephemeris stops covering the near future, and once the bundled GP
 * snapshot is too old to place low-orbit satellites meaningfully. Review
 * windows live in src/lib/source-governance.ts, which is imported rather than
 * parsed so the registry cannot drift away from what the app actually ships.
 */
import { readFileSync } from 'node:fs'
import { PROBE_EPHEMERIS } from '../src/lib/generated/probe-ephemeris.ts'
import { parseOmmCsv } from '../src/lib/omm.ts'
import { SOURCE_DATASETS, getSourceFreshness } from '../src/lib/source-governance.ts'

/** Days of remaining Horizons coverage below which the table must be regenerated. */
const EPHEMERIS_COVERAGE_MARGIN_DAYS = 180

/**
 * The weekly snapshot workflow keeps the bundled GP set days old. This limit
 * only trips when that workflow has been failing for months; past it, the
 * offline fallback places low-orbit satellites thousands of kilometres off.
 */
const GP_SNAPSHOT_MAX_AGE_DAYS = 120

const now = Date.now()
const overdue = []
const rows = []

for (const dataset of Object.values(SOURCE_DATASETS)) {
  const freshness = getSourceFreshness(dataset.verifiedAt, now, dataset.maxAgeDays)
  if (freshness.state === 'invalid') {
    throw new Error(
      `Source dataset "${dataset.id}" has an unparseable review date: ${dataset.verifiedAt}`,
    )
  }
  rows.push(
    `  ${dataset.id.padEnd(20)} ${freshness.ageDays}/${dataset.maxAgeDays} days · ${dataset.sourceUrl}`,
  )
  if (freshness.state === 'review-required') {
    overdue.push(
      `  ${dataset.id}: reviewed ${freshness.ageDays} days ago, window is ${dataset.maxAgeDays} days (${dataset.sourceUrl})`,
    )
  }
}

if (overdue.length > 0) {
  throw new Error(
    `Source review overdue for ${overdue.length} dataset(s). Re-check each primary source, then update verifiedAt in src/lib/source-governance.ts:\n${overdue.join('\n')}`,
  )
}

const stopMs = Date.parse(`${PROBE_EPHEMERIS.stopTime}T00:00:00Z`)
if (!Number.isFinite(stopMs)) {
  throw new Error(`Probe ephemeris stopTime is unparseable: ${PROBE_EPHEMERIS.stopTime}`)
}
const coverageDaysLeft = Math.floor((stopMs - now) / 86_400_000)
if (coverageDaysLeft < EPHEMERIS_COVERAGE_MARGIN_DAYS) {
  throw new Error(
    `Baked probe ephemeris runs out on ${PROBE_EPHEMERIS.stopTime} (${coverageDaysLeft} days left, margin is ${EPHEMERIS_COVERAGE_MARGIN_DAYS}). Run "npm run generate:probe-ephemeris" and commit the result.`,
  )
}

const snapshot = parseOmmCsv(readFileSync(new URL('../public/data/gp-active.csv', import.meta.url), 'utf8'))
const epochs = snapshot.records.map((record) => record.epochMs).sort((left, right) => left - right)
if (epochs.length === 0) throw new Error('public/data/gp-active.csv contains no element sets')
const snapshotAgeDays = Math.floor((now - epochs[Math.floor(epochs.length / 2)]) / 86_400_000)
if (snapshotAgeDays > GP_SNAPSHOT_MAX_AGE_DAYS) {
  throw new Error(
    `Bundled GP snapshot median epoch is ${snapshotAgeDays} days old (limit ${GP_SNAPSHOT_MAX_AGE_DAYS}). Run "npm run generate:gp-snapshots" and commit the result.`,
  )
}

console.log(`Source review is current for ${rows.length} datasets:`)
console.log(rows.join('\n'))
console.log(
  `Probe ephemeris covers ${PROBE_EPHEMERIS.startTime} to ${PROBE_EPHEMERIS.stopTime} (${coverageDaysLeft} days left).`,
)
console.log(
  `Bundled GP snapshot: ${snapshot.records.length} element sets, median epoch ${snapshotAgeDays}/${GP_SNAPSHOT_MAX_AGE_DAYS} days old.`,
)
