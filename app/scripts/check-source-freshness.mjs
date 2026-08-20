/**
 * Fails the build once any dataset's review window expires, and once the baked
 * probe ephemeris stops covering the near future. Both are governed by
 * src/lib/source-governance.ts, which is imported rather than parsed so the
 * registry cannot drift away from what the app actually ships.
 */
import { PROBE_EPHEMERIS } from '../src/lib/generated/probe-ephemeris.ts'
import { SOURCE_DATASETS, getSourceFreshness } from '../src/lib/source-governance.ts'

/** Days of remaining Horizons coverage below which the table must be regenerated. */
const EPHEMERIS_COVERAGE_MARGIN_DAYS = 180

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

console.log(`Source review is current for ${rows.length} datasets:`)
console.log(rows.join('\n'))
console.log(
  `Probe ephemeris covers ${PROBE_EPHEMERIS.startTime} to ${PROBE_EPHEMERIS.stopTime} (${coverageDaysLeft} days left).`,
)
