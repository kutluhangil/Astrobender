import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import test from 'node:test'

const LOW_RES_MOON_TEXTURES = [
  'public/textures/moon-4k.webp',
  'public/textures/moon-bump-2k.webp',
  'public/textures/moon-specular-2k.webp',
]

// Bump/specular are scalar masks (height field, specular mask); they stay at 2K
// permanently — only the colour texture upgrades to 8K on focus. Budget reflects
// the new eager-load set: moon-4k.webp (~3.5 MiB) + two 2K masks (~1.5 MiB).
test('initial Moon texture payload stays below the 5 MiB budget', () => {
  const totalBytes = LOW_RES_MOON_TEXTURES.reduce(
    (total, path) => total + statSync(path).size,
    0,
  )
  assert.ok(
    totalBytes < 5 * 1024 * 1024,
    `Initial Moon textures are ${(totalBytes / 1024 / 1024).toFixed(2)} MiB`,
  )
})

test('8K Moon colour texture is requested only by the focus-triggered upgrade', () => {
  const source = readFileSync('src/lib/globe-engine.ts', 'utf8')
  const upgradeIndex = source.indexOf('private loadMoonHighResolution()')
  assert.ok(upgradeIndex > 0)
  assert.ok(
    source.indexOf('moon-8k.jpg') > upgradeIndex,
    'moon-8k.jpg must not be part of the initial texture load',
  )
  assert.match(source, /if \(target === 'moon'\) this\.loadMoonHighResolution\(\)/)
})

// Bump/specular no longer have an 8K variant on disk — the finite-difference
// height/specular sampling doesn't benefit from resolution beyond 2K, so there
// is no focus-triggered upgrade path for them anymore.
test('Moon bump/specular textures have no 8K upgrade path', () => {
  const source = readFileSync('src/lib/globe-engine.ts', 'utf8')
  assert.doesNotMatch(source, /moon-bump-8k\.jpg/)
  assert.doesNotMatch(source, /moon-specular-8k\.jpg/)
})

test('planet textures are demand-loaded instead of preloaded in the background', () => {
  const source = readFileSync('src/lib/globe-engine.ts', 'utf8')

  assert.doesNotMatch(source, /planetRuntimes\.forEach[\s\S]*ensureLoaded/)
  assert.match(source, /info\.ensureLoaded\?\.\(\)/)
})
