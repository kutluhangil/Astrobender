import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import test from 'node:test'

const LOW_RES_MOON_TEXTURES = [
  'public/textures/moon-4k.webp',
  'public/textures/moon-bump-4k.webp',
  'public/textures/moon-specular-4k.webp',
]

test('initial Moon texture payload stays below the 13 MiB budget', () => {
  const totalBytes = LOW_RES_MOON_TEXTURES.reduce(
    (total, path) => total + statSync(path).size,
    0,
  )
  assert.ok(
    totalBytes < 13 * 1024 * 1024,
    `Initial Moon textures are ${(totalBytes / 1024 / 1024).toFixed(2)} MiB`,
  )
})

test('8K Moon textures are requested only by the focus-triggered upgrade', () => {
  const source = readFileSync('src/lib/globe-engine.ts', 'utf8')
  const upgradeIndex = source.indexOf('private loadMoonHighResolution()')
  assert.ok(upgradeIndex > 0)
  for (const fileName of ['moon-8k.jpg', 'moon-bump-8k.jpg', 'moon-specular-8k.jpg']) {
    assert.ok(
      source.indexOf(fileName) > upgradeIndex,
      `${fileName} must not be part of the initial texture load`,
    )
  }
  assert.match(source, /if \(target === 'moon'\) this\.loadMoonHighResolution\(\)/)
})

test('planet textures are demand-loaded instead of preloaded in the background', () => {
  const source = readFileSync('src/lib/globe-engine.ts', 'utf8')

  assert.doesNotMatch(source, /planetRuntimes\.forEach[\s\S]*ensureLoaded/)
  assert.match(source, /info\.ensureLoaded\?\.\(\)/)
})
