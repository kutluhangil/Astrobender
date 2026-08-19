import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const manifestPath = join(__dirname, '..', 'public', 'data', 'texture-manifest.json')
const texturesDir = join(__dirname, '..', 'public', 'textures')

test('texture manifest matches the files on disk', () => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  const diskFiles = readdirSync(texturesDir)
    .filter((name) => !name.startsWith('.'))
    .sort()

  assert.equal(manifest.files.length, diskFiles.length)

  let expectedTotal = 0
  for (const [index, name] of diskFiles.entries()) {
    const entry = manifest.files[index]
    assert.equal(entry.file, name)
    const bytes = statSync(join(texturesDir, name)).size
    assert.equal(
      entry.bytes,
      bytes,
      `${name} byte size is stale — rerun npm run generate:texture-manifest`,
    )
    expectedTotal += bytes
  }
  assert.equal(manifest.totalBytes, expectedTotal)
})
