import { readFileSync } from 'node:fs'

const attributionsPath = new URL('../public/data/asset-attributions.json', import.meta.url)
const manifestPath = new URL('../public/data/texture-manifest.json', import.meta.url)
const attributions = JSON.parse(readFileSync(attributionsPath, 'utf8'))
const textureManifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

if (!Array.isArray(attributions.attributions) || attributions.attributions.length === 0) {
  throw new Error('Asset attribution registry is missing entries')
}

const scopes = new Set(attributions.attributions.map((entry) => entry.scope))
for (const requiredScope of ['textures/*', 'audio/*', 'icons/*']) {
  if (!scopes.has(requiredScope)) {
    throw new Error(`Asset attribution registry is missing required scope: ${requiredScope}`)
  }
}

for (const entry of attributions.attributions) {
  if (typeof entry.label !== 'string' || entry.label.length < 4) {
    throw new Error(`Asset attribution label is invalid for scope: ${entry.scope}`)
  }
  if (typeof entry.sourceUrl !== 'string' || !/^https:\/\//.test(entry.sourceUrl)) {
    throw new Error(`Asset attribution source URL is invalid for scope: ${entry.scope}`)
  }
}

if (!Array.isArray(textureManifest.files) || textureManifest.files.length === 0) {
  throw new Error('Texture manifest is empty; asset attribution coverage cannot be verified')
}

console.log(`Asset attribution registry covers ${textureManifest.files.length} texture files and runtime audio/icons.`)
