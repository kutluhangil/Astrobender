import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  TEXTURE_LOAD_RADII,
  TEXTURE_RELEASE_RADII,
  estimateTextureBytes,
  textureBytesToMib,
  textureLodAction,
} from '../src/lib/texture-lod.ts'

const base = { radius: 1, focused: false, resident: false, loading: false, visible: true }

test('a body loads its detail texture only once the camera is close', () => {
  assert.equal(textureLodAction({ ...base, distance: TEXTURE_LOAD_RADII - 1 }), 'load')
  assert.equal(textureLodAction({ ...base, distance: TEXTURE_LOAD_RADII + 1 }), 'keep')
  // A request already in flight is not duplicated.
  assert.equal(textureLodAction({ ...base, distance: 1, loading: true }), 'keep')
})

test('the focused body keeps its texture at any distance', () => {
  const far = { ...base, focused: true, distance: TEXTURE_RELEASE_RADII * 10 }
  assert.equal(textureLodAction(far), 'load')
  assert.equal(textureLodAction({ ...far, resident: true }), 'keep')
})

test('a distant unfocused body releases its texture', () => {
  const resident = { ...base, resident: true }
  assert.equal(textureLodAction({ ...resident, distance: TEXTURE_RELEASE_RADII + 1 }), 'release')
  assert.equal(textureLodAction({ ...resident, distance: TEXTURE_RELEASE_RADII - 1 }), 'keep')
})

test('the load and release bands do not touch, so drifting cannot thrash', () => {
  assert.ok(TEXTURE_RELEASE_RADII > TEXTURE_LOAD_RADII * 1.5)
  // Anywhere in the gap, a resident texture stays and an absent one stays absent.
  for (const distance of [TEXTURE_LOAD_RADII + 1, TEXTURE_RELEASE_RADII - 1]) {
    assert.equal(textureLodAction({ ...base, distance }), 'keep')
    assert.equal(textureLodAction({ ...base, distance, resident: true }), 'keep')
  }
})

test('thresholds scale with the body, not with absolute scene units', () => {
  // A moon 100 times smaller releases its texture 100 times closer in.
  const moon = { ...base, radius: 0.01, resident: true, distance: 1 }
  assert.equal(textureLodAction(moon), 'release')
  assert.equal(textureLodAction({ ...moon, radius: 1 }), 'keep')
})

test('impossible geometry raises instead of unloading the whole scene', () => {
  assert.throws(
    () => textureLodAction({ ...base, distance: Number.NaN }),
    /Invalid camera distance/,
  )
  assert.throws(() => textureLodAction({ ...base, distance: 1, radius: 0 }), /Invalid body radius/)
  assert.throws(() => estimateTextureBytes(0, 1024), /Invalid texture dimensions/)
  assert.throws(() => textureBytesToMib(-1), /Invalid texture byte count/)
})

test('the decoded cost of a texture is what the budget counts', () => {
  // 8192x4096 RGBA plus its mip chain — the reason a session cannot hold many.
  assert.equal(Math.round(textureBytesToMib(estimateTextureBytes(8192, 4096))), 171)
  assert.equal(Math.round(textureBytesToMib(estimateTextureBytes(4096, 2048))), 43)
  assert.ok(
    estimateTextureBytes(8192, 4096) > estimateTextureBytes(4096, 2048) * 3.9,
    'doubling each edge must roughly quadruple the cost',
  )
})

test('the engine releases detail textures instead of holding them for the session', () => {
  const source = readFileSync('src/lib/globe-engine.ts', 'utf8')

  assert.match(source, /private updateTextureLod\(\)/)
  assert.match(source, /this\.updateTextureLod\(\)/)
  assert.match(source, /if \(action === 'load'\) lod\.request\(\)/)
  assert.match(source, /else if \(action === 'release'\) lod\.release\(\)/)
  // Releasing must actually free the GPU allocation, not just swap the uniform.
  assert.match(source, /runtime\.detail\.dispose\(\)/)
  // The Moon's 8K upgrade goes through the same path as every other body.
  assert.match(source, /this\.moonLod\.request\(\)/)
  assert.match(source, /this\.moonLod\?\.release\(\)/)
})

test('an off-screen body does not load, but an off-screen resident one is not reloaded either', () => {
  const offScreen = { ...base, visible: false, distance: 1 }
  assert.equal(textureLodAction(offScreen), 'keep')
  // Releasing ignores visibility, so turning the camera away and back cannot
  // start a reload cycle for a texture that is already in memory.
  assert.equal(textureLodAction({ ...offScreen, resident: true }), 'keep')
  assert.equal(
    textureLodAction({ ...offScreen, resident: true, distance: TEXTURE_RELEASE_RADII + 1 }),
    'release',
  )
  // The focused body loads even when the camera has not swung onto it yet.
  assert.equal(textureLodAction({ ...offScreen, focused: true }), 'load')
})
