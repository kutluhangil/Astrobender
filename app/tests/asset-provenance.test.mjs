import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'

const appRoot = join(import.meta.dirname, '..')
const publicRoot = join(appRoot, 'public')

function runtimeFiles(directory) {
  const path = join(publicRoot, directory)
  return existsSync(path) ? readdirSync(path).filter((file) => !file.startsWith('.')).sort() : []
}

test('the shipped runtime contains no untraceable texture or audio media', () => {
  const manifest = JSON.parse(readFileSync(join(publicRoot, 'data', 'texture-manifest.json'), 'utf8'))
  const attributions = JSON.parse(readFileSync(join(publicRoot, 'data', 'asset-attributions.json'), 'utf8'))

  assert.deepEqual(runtimeFiles('textures'), [])
  assert.deepEqual(runtimeFiles('audio'), [])
  assert.deepEqual(manifest, { totalBytes: 0, files: [] })
  assert.deepEqual(
    attributions.assets.map((asset) => asset.file).sort(),
    runtimeFiles('icons').map((file) => `icons/${file}`),
  )
  assert.equal(
    attributions.assets.filter((asset) => asset.provenanceStatus !== 'complete').length,
    0,
  )
})

test('asset attribution checker rejects an incomplete provenance record', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'astrobender-asset-provenance-'))
  const fixturePublicRoot = join(fixtureRoot, 'public')
  const iconDirectory = join(fixturePublicRoot, 'icons')
  const dataDirectory = join(fixturePublicRoot, 'data')
  mkdirSync(iconDirectory, { recursive: true })
  mkdirSync(dataDirectory, { recursive: true })
  writeFileSync(join(iconDirectory, 'test-icon.png'), 'owned test icon')
  writeFileSync(join(dataDirectory, 'texture-manifest.json'), JSON.stringify({ totalBytes: 0, files: [] }))
  writeFileSync(
    join(dataDirectory, 'asset-attributions.json'),
    JSON.stringify({
      schemaVersion: 3,
      assets: [{
        file: 'icons/test-icon.png',
        publisher: 'ASTROBENDER',
        providerUrl: 'https://github.com/kutluhangil/Astrobender',
        usagePolicy: 'Rights managed by the project owner',
        sha256: 'fc8b371392a53a646abeed2cccf7d29dfe6f0d9594fd8022976f5590db020443',
        transformationNotes: 'Generated locally for the fixture.',
        provenanceStatus: 'incomplete',
        sourcePage: null,
        retrievedAt: null,
        firstCommittedAt: '2026-08-06',
        provenanceLimitation: 'Fixture intentionally simulates an incomplete record.',
      }],
    }),
  )

  try {
    const output = execFileSync(process.execPath, ['scripts/check-asset-attributions.mjs'], {
      cwd: appRoot,
      encoding: 'utf8',
      env: { ...process.env, ASSET_ATTRIBUTIONS_PUBLIC_ROOT: fixturePublicRoot },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    assert.fail(`Checker accepted incomplete provenance fixture: ${output}`)
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`
    assert.match(output, /incomplete provenance records/i)
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true })
  }
})

test('asset attribution checker rejects a shipped texture omitted from the manifest', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'astrobender-unmanifested-texture-'))
  const fixturePublicRoot = join(fixtureRoot, 'public')
  const textureDirectory = join(fixturePublicRoot, 'textures')
  const dataDirectory = join(fixturePublicRoot, 'data')
  mkdirSync(textureDirectory, { recursive: true })
  mkdirSync(dataDirectory, { recursive: true })
  writeFileSync(join(textureDirectory, 'unattributed-surface.png'), 'untraceable fixture texture')
  writeFileSync(join(dataDirectory, 'texture-manifest.json'), JSON.stringify({ totalBytes: 0, files: [] }))
  writeFileSync(
    join(dataDirectory, 'asset-attributions.json'),
    JSON.stringify({ schemaVersion: 3, assets: [] }),
  )

  try {
    execFileSync(process.execPath, ['scripts/check-asset-attributions.mjs'], {
      cwd: appRoot,
      encoding: 'utf8',
      env: { ...process.env, ASSET_ATTRIBUTIONS_PUBLIC_ROOT: fixturePublicRoot },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    assert.fail('Checker accepted a shipped texture that the manifest omitted')
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`
    assert.match(output, /Texture manifest coverage mismatch/)
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true })
  }
})
