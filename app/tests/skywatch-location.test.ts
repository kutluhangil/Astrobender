import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseSkywatchObserver,
  validateSkywatchCoordinates,
} from '../src/lib/skywatch-location.ts'

test('Skywatch location validates coordinate ranges and rejects corrupt storage', () => {
  assert.deepEqual(validateSkywatchCoordinates(41.0082, 28.9784, 'Istanbul'), {
    latitude: 41.0082,
    longitude: 28.9784,
    label: 'Istanbul',
  })
  assert.throws(
    () => validateSkywatchCoordinates(91, 28, 'Invalid'),
    /latitude.*-90.*90/i,
  )
  assert.equal(parseSkywatchObserver('{invalid json}'), null)
})
