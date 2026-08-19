import test from 'node:test'
import assert from 'node:assert/strict'
import { formatStorageSize, storageUsagePercent } from '../src/lib/offline-storage.ts'

test('offline storage formats browser estimates without hiding unknown values', () => {
  assert.equal(formatStorageSize(85 * 1024 * 1024, 'tr'), '85 MiB')
  assert.equal(formatStorageSize(2.5 * 1024 * 1024 * 1024, 'en'), '2.5 GiB')
  assert.equal(formatStorageSize(null, 'tr'), 'Bilinmiyor')
})

test('offline storage percentage rejects missing or invalid quotas', () => {
  assert.equal(storageUsagePercent(80, 100), 80)
  assert.equal(storageUsagePercent(null, 100), null)
  assert.equal(storageUsagePercent(100, 0), null)
})
