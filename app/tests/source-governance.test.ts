import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SOURCE_REVIEW_MAX_AGE_DAYS,
  formatSourceReviewStatus,
  getSourceFreshness,
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
