import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '..', 'public', 'icons')

const EXPECTED = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-512-maskable.png', size: 512 },
  { name: 'apple-touch-icon-180.png', size: 180 },
]

test('generated PWA icons are valid PNGs at the expected size', () => {
  for (const { name, size } of EXPECTED) {
    const buf = readFileSync(join(iconsDir, name))
    assert.deepEqual(
      [...buf.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
      `${name} missing PNG signature`,
    )
    assert.equal(buf.readUInt32BE(16), size, `${name} width`)
    assert.equal(buf.readUInt32BE(20), size, `${name} height`)
    assert.equal(buf[25], 6, `${name} color type should be RGBA (6)`)
  }
})
