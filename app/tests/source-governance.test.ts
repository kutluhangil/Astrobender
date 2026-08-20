import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SOURCE_DATASETS,
  SOURCE_REVIEW_MAX_AGE_DAYS,
  formatSourceReviewStatus,
  getDatasetFreshness,
  getSourceDataset,
  getSourceFreshness,
  stalestDataset,
} from '../src/lib/source-governance.ts'

const NOW = Date.parse('2026-08-11T12:00:00Z')

test('source governance marks recent and overdue catalog checks explicitly', () => {
  assert.deepEqual(getSourceFreshness('2026-08-01', NOW), { ageDays: 10, state: 'current' })
  assert.deepEqual(
    getSourceFreshness('2026-01-01', NOW),
    { ageDays: 222, state: 'review-required' },
  )
  assert.equal(SOURCE_REVIEW_MAX_AGE_DAYS, 120)
})

test('source governance rejects malformed dates and localizes the review state', () => {
  const invalid = getSourceFreshness('2026/08/01', NOW)
  assert.deepEqual(invalid, { ageDays: null, state: 'invalid' })
  assert.equal(formatSourceReviewStatus(invalid, 'tr'), 'Tarih doğrulanamadı')
  assert.equal(
    formatSourceReviewStatus({ ageDays: 121, state: 'review-required' }, 'en'),
    'Source review required · 121 days',
  )
})

test('every registered dataset states a source, a review date, a window and a reason', () => {
  const datasets = Object.values(SOURCE_DATASETS)
  assert.ok(datasets.length >= 13, `Only ${datasets.length} datasets are registered`)

  for (const dataset of datasets) {
    assert.match(dataset.verifiedAt, /^\d{4}-\d{2}-\d{2}$/, `${dataset.id} review date`)
    assert.match(dataset.sourceUrl, /^https:\/\//, `${dataset.id} source URL`)
    assert.ok(dataset.maxAgeDays > 0, `${dataset.id} review window`)
    assert.ok(dataset.why.length > 20, `${dataset.id} needs a stated reason for its window`)
    assert.ok(dataset.labelTr.length > 0 && dataset.labelEn.length > 0, `${dataset.id} labels`)
    // Every date must be in the past; a future review has not happened yet.
    assert.ok(Date.parse(`${dataset.verifiedAt}T00:00:00Z`) <= Date.now(), `${dataset.id} is dated in the future`)
  }
})

test('review windows are chosen per dataset rather than shared', () => {
  // A frozen historical catalogue and a yearly shower calendar cannot sensibly
  // carry the same window, which is the whole reason the registry exists.
  assert.ok(
    getSourceDataset('bright-stars').maxAgeDays >
      getSourceDataset('meteor-showers').maxAgeDays * 4,
    'the frozen star catalogue must outlive the yearly meteor calendar',
  )
  assert.equal(getSourceDataset('celestial-catalog').maxAgeDays, SOURCE_REVIEW_MAX_AGE_DAYS)
  assert.equal(getSourceDataset('constellations').maxAgeDays, 3650)
  assert.throws(
    // @ts-expect-error deliberately unregistered id
    () => getSourceDataset('exoplanets'),
    /Unknown source dataset/,
  )
})

test('dataset freshness uses that dataset own window, not the default', () => {
  const stars = getSourceDataset('bright-stars')
  const twoYearsOn = Date.parse(`${stars.verifiedAt}T00:00:00Z`) + 730 * 86_400_000

  assert.equal(getDatasetFreshness('bright-stars', twoYearsOn).state, 'current')
  // The same age against the shared 120-day default would already be overdue.
  assert.equal(getSourceFreshness(stars.verifiedAt, twoYearsOn).state, 'review-required')
})

test('a panel citing several sources reports its stalest one', () => {
  const catalog = getSourceDataset('celestial-catalog')
  const at = Date.parse(`${catalog.verifiedAt}T00:00:00Z`) + 100 * 86_400_000

  const review = stalestDataset(['celestial-catalog', 'physical-profiles', 'bright-stars'], at)
  assert.equal(review.dataset.id, 'celestial-catalog')
  assert.equal(review.freshness.state, 'current')

  // Order must not matter, and a single-entry set reports itself.
  assert.equal(
    stalestDataset(['bright-stars', 'celestial-catalog'], at).dataset.id,
    'celestial-catalog',
  )
  assert.equal(stalestDataset(['bright-stars'], at).dataset.id, 'bright-stars')
  assert.throws(() => stalestDataset([], at), /No source datasets given/)
})
