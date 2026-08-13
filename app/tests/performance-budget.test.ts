import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import test from 'node:test'
import {
  applySchematicSurfaceVisibility,
  DEFAULT_SCHEMATIC_SURFACES_VISIBLE,
} from '../src/lib/schematic-surfaces.ts'

const MEDIA_DIRECTORIES = ['public/textures', 'public/audio']

test('initial scene ships no texture or narration payload', () => {
  const totalBytes = MEDIA_DIRECTORIES.reduce((total, directory) => {
    if (!existsSync(directory)) return total
    return total + readdirSync(directory)
      .filter((file) => !file.startsWith('.'))
      .reduce((directoryTotal, file) => directoryTotal + statSync(`${directory}/${file}`).size, 0)
  }, 0)

  assert.equal(totalBytes, 0, `Shipped texture/audio media is ${totalBytes} bytes`)
})

test('procedural surface visibility defaults to hidden and can be enabled only on request', () => {
  const surfaces = [{ visible: true }, { visible: true }, { visible: true }]

  assert.equal(DEFAULT_SCHEMATIC_SURFACES_VISIBLE, false)
  applySchematicSurfaceVisibility(surfaces, DEFAULT_SCHEMATIC_SURFACES_VISIBLE)
  assert.deepEqual(surfaces.map((surface) => surface.visible), [false, false, false])

  applySchematicSurfaceVisibility(surfaces, true)
  assert.deepEqual(surfaces.map((surface) => surface.visible), [true, true, true])
})

test('procedural globe surfaces have no runtime media URLs', () => {
  const source = readFileSync('src/lib/globe-engine.ts', 'utf8')
  assert.match(source, /createSchematicSurfaceTexture/)
  assert.match(source, /setSchematicSurfacesVisible\(visible: boolean\)/)
  assert.match(source, /applySchematicSurfaceVisibility\(this\.schematicSurfaceRoots, visible\)/)
  assert.doesNotMatch(source, /TextureLoader/)
  assert.doesNotMatch(source, /\/textures\//)
  assert.doesNotMatch(source, /\/audio\//)
})
