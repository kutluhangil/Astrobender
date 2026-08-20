export const SOURCE_REVIEW_MAX_AGE_DAYS = 120

export type SourceReviewState = 'current' | 'review-required' | 'invalid'

export interface SourceFreshness {
  ageDays: number | null
  state: SourceReviewState
}

function parseUtcDate(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const parsed = Date.parse(`${date}T00:00:00Z`)
  return Number.isFinite(parsed) ? parsed : null
}

export function getSourceFreshness(
  verifiedAt: string,
  nowMs = Date.now(),
  maxAgeDays = SOURCE_REVIEW_MAX_AGE_DAYS,
): SourceFreshness {
  const verifiedAtMs = parseUtcDate(verifiedAt)
  if (verifiedAtMs === null || !Number.isFinite(nowMs) || maxAgeDays < 0) {
    return { ageDays: null, state: 'invalid' }
  }

  const ageDays = Math.max(0, Math.floor((nowMs - verifiedAtMs) / 86_400_000))
  return {
    ageDays,
    state: ageDays > maxAgeDays ? 'review-required' : 'current',
  }
}

export function formatSourceReviewStatus(freshness: SourceFreshness, language: 'tr' | 'en'): string {
  if (freshness.state === 'invalid') {
    return language === 'tr' ? 'Tarih doğrulanamadı' : 'Date could not be verified'
  }

  if (freshness.state === 'review-required') {
    return language === 'tr'
      ? `Kaynak incelemesi gerekli · ${freshness.ageDays} gün`
      : `Source review required · ${freshness.ageDays} days`
  }

  return language === 'tr'
    ? `Kaynak doğrulandı · ${freshness.ageDays} gün önce`
    : `Source verified · ${freshness.ageDays} days ago`
}

/**
 * Every dataset in the app that carries a numeric or factual claim taken from a
 * primary source. One review date per dataset, because they do not age at the
 * same rate: a comet's orbital elements are refit every apparition, while the
 * Yale Bright Star Catalogue's fifth revised edition has been frozen since 1991.
 */
export type SourceDatasetId =
  | 'celestial-catalog'
  | 'physical-profiles'
  | 'ring-systems'
  | 'comets'
  | 'small-bodies'
  | 'lagrange'
  | 'probe-ephemeris'
  | 'mission-timeline'
  | 'bright-stars'
  | 'constellations'
  | 'surface-sites'
  | 'sky-events'
  | 'meteor-showers'

export interface SourceDataset {
  id: SourceDatasetId
  labelTr: string
  labelEn: string
  /** Primary source the dataset's numbers were read from. */
  sourceUrl: string
  /** Date a person last checked those numbers against that source. */
  verifiedAt: string
  /** Review window in days, chosen per dataset. See `why` for the reasoning. */
  maxAgeDays: number
  /** Why this dataset carries the review window it does. */
  why: string
}

const DATASETS: SourceDataset[] = [
  {
    id: 'celestial-catalog',
    labelTr: 'Gök cismi kataloğu',
    labelEn: 'Celestial catalog',
    sourceUrl: 'https://science.nasa.gov/solar-system/',
    verifiedAt: '2026-07-26',
    maxAgeDays: SOURCE_REVIEW_MAX_AGE_DAYS,
    why: 'NASA science pages are edited continuously, so the copied facts need a short window.',
  },
  {
    id: 'physical-profiles',
    labelTr: 'JPL fiziksel profiller',
    labelEn: 'JPL physical profiles',
    sourceUrl: 'https://ssd.jpl.nasa.gov/planets/phys_par.html',
    verifiedAt: '2026-08-19',
    maxAgeDays: 365,
    why: 'JPL revises published physical parameters on the timescale of new mission results.',
  },
  {
    id: 'ring-systems',
    labelTr: 'PDS halka sistemleri',
    labelEn: 'PDS ring systems',
    sourceUrl: 'https://pds-rings.seti.org/',
    verifiedAt: '2026-08-19',
    maxAgeDays: 365,
    why: 'Ring band radii come from settled Voyager and Cassini analysis.',
  },
  {
    id: 'comets',
    labelTr: 'Kuyruklu yıldız yörüngeleri',
    labelEn: 'Comet orbits',
    sourceUrl: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html',
    verifiedAt: '2026-08-19',
    maxAgeDays: SOURCE_REVIEW_MAX_AGE_DAYS,
    why: 'SBDB refits cometary elements as new astrometry arrives, and the drift the UI quotes moves with them.',
  },
  {
    id: 'small-bodies',
    labelTr: 'Küçük cisim kataloğu',
    labelEn: 'Small-body catalog',
    sourceUrl: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html',
    verifiedAt: '2026-08-19',
    maxAgeDays: SOURCE_REVIEW_MAX_AGE_DAYS,
    why: 'Designations and elements of named small bodies are revised as observation arcs lengthen.',
  },
  {
    id: 'lagrange',
    labelTr: 'Lagrange noktaları',
    labelEn: 'Lagrange points',
    sourceUrl: 'https://science.nasa.gov/resource/what-is-a-lagrange-point/',
    verifiedAt: '2026-08-19',
    maxAgeDays: 365,
    why: 'The Hill series is analytic; only the quoted NASA distances and the MPC Trojan list can move.',
  },
  {
    id: 'probe-ephemeris',
    labelTr: 'Sonda efemerisi',
    labelEn: 'Probe ephemeris',
    sourceUrl: 'https://ssd.jpl.nasa.gov/horizons/',
    verifiedAt: '2026-08-19',
    maxAgeDays: SOURCE_REVIEW_MAX_AGE_DAYS,
    why: 'The baked Horizons table also has a hard coverage window; see scripts/check-source-freshness.mjs.',
  },
  {
    id: 'mission-timeline',
    labelTr: 'Görev zaman tüneli',
    labelEn: 'Mission timeline',
    sourceUrl: 'https://nssdc.gsfc.nasa.gov/nmc/',
    verifiedAt: '2026-08-19',
    maxAgeDays: 365,
    why: 'The listed moments are historical, but new landings keep being added to the master catalog.',
  },
  {
    id: 'bright-stars',
    labelTr: 'Parlak yıldız kataloğu',
    labelEn: 'Bright star catalogue',
    sourceUrl: 'https://cdsarc.cds.unistra.fr/viz-bin/cat/V/50',
    verifiedAt: '2026-08-19',
    maxAgeDays: 3650,
    why: 'The Yale Bright Star Catalogue, 5th revised edition, has been frozen since 1991; a short review window would be theatre.',
  },
  {
    id: 'constellations',
    labelTr: 'Takımyıldız sınırları',
    labelEn: 'Constellation boundaries',
    sourceUrl: 'https://www.iau.org/Iau/Science/What-we-do/The-Constellations.aspx',
    verifiedAt: '2026-08-19',
    maxAgeDays: 3650,
    why: 'The IAU fixed the 88 boundaries in 1930 and defines no official figures, so nothing here expires.',
  },
  {
    id: 'surface-sites',
    labelTr: 'Yer yüzeyi tesisleri',
    labelEn: 'Earth surface sites',
    sourceUrl: 'https://www.jpl.nasa.gov/missions/dsn/',
    verifiedAt: '2026-08-19',
    maxAgeDays: 365,
    why: 'Launch sites and observatories move rarely, but their operators restructure their pages.',
  },
  {
    id: 'sky-events',
    labelTr: 'Gökyüzü olayları',
    labelEn: 'Sky events',
    sourceUrl: 'https://science.nasa.gov/eclipses/future-eclipses/',
    verifiedAt: '2026-08-19',
    maxAgeDays: 365,
    why: 'Eclipse circumstances are fixed, but the published event list rolls forward each year.',
  },
  {
    id: 'meteor-showers',
    labelTr: 'Meteor yağmurları',
    labelEn: 'Meteor showers',
    sourceUrl: 'https://www.imo.net/files/meteor-shower/cal2026.pdf',
    verifiedAt: '2026-08-19',
    maxAgeDays: SOURCE_REVIEW_MAX_AGE_DAYS,
    why: 'The IMO publishes a new shower calendar every year, so the cited PDF goes out of date annually.',
  },
]

export const SOURCE_DATASETS: Record<SourceDatasetId, SourceDataset> = Object.fromEntries(
  DATASETS.map((dataset) => [dataset.id, dataset]),
) as Record<SourceDatasetId, SourceDataset>

export function getSourceDataset(id: SourceDatasetId): SourceDataset {
  const dataset = SOURCE_DATASETS[id]
  if (!dataset) throw new Error(`Unknown source dataset: ${id}`)
  return dataset
}

export function getDatasetFreshness(id: SourceDatasetId, nowMs = Date.now()): SourceFreshness {
  const dataset = getSourceDataset(id)
  return getSourceFreshness(dataset.verifiedAt, nowMs, dataset.maxAgeDays)
}

export interface DatasetReview {
  dataset: SourceDataset
  freshness: SourceFreshness
}

/**
 * The dataset in the given set that is closest to falling out of review. A panel
 * citing several sources is only as fresh as its stalest one, so that is the
 * status it should report.
 */
export function stalestDataset(ids: SourceDatasetId[], nowMs = Date.now()): DatasetReview {
  if (ids.length === 0) throw new Error('No source datasets given to review')
  const reviews = ids.map((id) => ({
    dataset: getSourceDataset(id),
    freshness: getDatasetFreshness(id, nowMs),
  }))
  return reviews.reduce((worst, review) => {
    if (review.freshness.state === 'invalid') return review
    if (worst.freshness.state === 'invalid') return worst
    const worstRemaining = worst.dataset.maxAgeDays - (worst.freshness.ageDays ?? 0)
    const remaining = review.dataset.maxAgeDays - (review.freshness.ageDays ?? 0)
    return remaining < worstRemaining ? review : worst
  })
}
