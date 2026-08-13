import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const manifestPath = join(__dirname, '..', 'public', 'data', 'texture-manifest.json')

test('texture manifest is empty while runtime surfaces are procedural', () => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  assert.deepEqual(manifest, { totalBytes: 0, files: [] })
  assert.equal(existsSync(join(__dirname, '..', 'public', 'textures')), false)
})
