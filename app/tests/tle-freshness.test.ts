import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DAY_MS,
  describeTleFreshness,
} from '../src/lib/tle-freshness.ts'

const now = Date.UTC(2026, 7, 11, 12, 0, 0)

test('TLE freshness distinguishes current, ageing and stale orbital epochs', () => {
  assert.equal(
    describeTleFreshness({ epochMs: now - 2 * DAY_MS, source: 'live' }, now).severity,
    'fresh',
  )
  assert.equal(
    describeTleFreshness({ epochMs: now - 8 * DAY_MS, source: 'cached' }, now).severity,
    'aging',
  )
  assert.equal(
    describeTleFreshness({ epochMs: now - 20 * DAY_MS, source: 'snapshot' }, now).severity,
    'stale',
  )
})

test('TLE freshness treats missing and future epochs as unknown instead of fresh', () => {
  assert.equal(describeTleFreshness({ epochMs: 0, source: 'snapshot' }, now).severity, 'unknown')
  assert.equal(
    describeTleFreshness({ epochMs: now + DAY_MS, source: 'live' }, now).severity,
    'unknown',
  )
})
