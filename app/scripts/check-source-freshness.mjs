import { readFileSync } from 'node:fs'
import { CELESTIAL_CATALOG } from '../src/lib/celestial-catalog.ts'
import { CELESTIAL_PHYSICAL_PROFILES } from '../src/lib/celestial-physical-profiles.ts'
import { getEarthSourceEvidence } from '../src/lib/earth-observatory.ts'
import { getJplCadEvidence } from '../src/lib/jpl-small-bodies.ts'
import {
  createTlePropagationEvidence,
  validateEvidenceRegistry,
} from '../src/lib/scientific-evidence.ts'
import { buildDataset, mergeFeeds } from '../src/lib/satellites.ts'
import { getSkyEvents } from '../src/lib/sky-events.ts'
import { SOURCE_REVIEW_MAX_AGE_DAYS } from '../src/lib/source-governance.ts'
import { TLE_SNAPSHOT_DOWNLOADED_AT } from '../src/lib/tle-snapshot-metadata.ts'

const nowMs = Date.now()
const dataUrl = (file) => new URL(`../public/data/${file}`, import.meta.url)
const snapshotFeeds = {
  active: readFileSync(dataUrl('tle-snapshot.txt'), 'utf8'),
  visual: readFileSync(dataUrl('tle-visual.txt'), 'utf8'),
  cosmos2251: readFileSync(dataUrl('tle-cosmos-2251-debris.txt'), 'utf8'),
  iridium33: readFileSync(dataUrl('tle-iridium-33-debris.txt'), 'utf8'),
  fengyun1c: readFileSync(dataUrl('tle-fengyun-1c-debris.txt'), 'utf8'),
}
const snapshotDataset = buildDataset(
  mergeFeeds(snapshotFeeds),
  'snapshot',
  TLE_SNAPSHOT_DOWNLOADED_AT,
)
const skyEvents = getSkyEvents({
  start: new Date('2026-01-01T00:00:00.000Z'),
  end: new Date('2026-12-31T23:59:59.999Z'),
  language: 'en',
})
const groups = [
  ...Object.values(CELESTIAL_CATALOG).map((entry) => ({
    id: `catalog:${entry.id}:facts`,
    evidence: entry.evidence,
  })),
  ...Object.entries(CELESTIAL_PHYSICAL_PROFILES).flatMap(([bodyId, profile]) =>
    ['mass', 'density', 'gravity'].flatMap((field) => {
      const evidence = profile.evidence[field]
      return evidence
        ? [{ id: `catalog:${bodyId}:physical:${field}`, evidence }]
        : []
    }),
  ),
  ...(['eonet', 'usgs', 'aurora']).map((source) => ({
    id: `runtime:earth:${source}`,
    evidence: getEarthSourceEvidence(source, nowMs),
  })),
  { id: 'runtime:jpl-cad', evidence: getJplCadEvidence(nowMs) },
  {
    id: 'runtime:tle-sgp4',
    evidence: createTlePropagationEvidence(snapshotDataset),
  },
  ...skyEvents.map((event) => ({ id: `skywatch:${event.id}`, evidence: event.evidence })),
]

const result = validateEvidenceRegistry(groups, nowMs, SOURCE_REVIEW_MAX_AGE_DAYS)
console.log(
  `Evidence source reviews are current: ${result.checked} groups checked; oldest ${result.oldestAgeDays}/${SOURCE_REVIEW_MAX_AGE_DAYS} days.`,
)
