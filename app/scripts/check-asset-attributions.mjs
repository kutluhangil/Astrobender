import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const publicRoot = process.env.ASSET_ATTRIBUTIONS_PUBLIC_ROOT
  ? `${process.env.ASSET_ATTRIBUTIONS_PUBLIC_ROOT.replace(/\/$/, '')}/`
  : fileURLToPath(new URL('../public/', import.meta.url))
const attributions = JSON.parse(
  readFileSync(`${publicRoot}data/asset-attributions.json`, 'utf8'),
)
const textureManifest = JSON.parse(
  readFileSync(`${publicRoot}data/texture-manifest.json`, 'utf8'),
)

if (attributions.schemaVersion !== 3 || !Array.isArray(attributions.assets)) {
  throw new Error('Asset attribution registry must use schemaVersion 3 with an assets array')
}
if (!Array.isArray(textureManifest.files)) {
  throw new Error('Texture manifest must contain a files array')
}

function runtimeFiles(directory) {
  const directoryPath = `${publicRoot}${directory}`
  return existsSync(directoryPath)
    ? readdirSync(directoryPath).filter((file) => !file.startsWith('.'))
    : []
}

const expectedFiles = [
  ...runtimeFiles('textures').map((file) => `textures/${file}`),
  ...runtimeFiles('audio').map((file) => `audio/${file}`),
  ...runtimeFiles('icons').map((file) => `icons/${file}`),
].sort()
const manifestFiles = textureManifest.files.map(({ file }) => file).sort()
const shippedTextureFiles = runtimeFiles('textures').sort()
if (JSON.stringify(manifestFiles) !== JSON.stringify(shippedTextureFiles)) {
  throw new Error(
    `Texture manifest coverage mismatch; manifest=[${manifestFiles.join(', ')}] shipped=[${shippedTextureFiles.join(', ')}]`,
  )
}
const attributedFiles = attributions.assets.map(({ file }) => file).sort()
const duplicates = attributedFiles.filter((file, index) => file === attributedFiles[index - 1])
if (duplicates.length > 0) {
  throw new Error(`Asset attribution registry has duplicate file entries: ${duplicates.join(', ')}`)
}
const missing = expectedFiles.filter((file) => !attributedFiles.includes(file))
const unexpected = attributedFiles.filter((file) => !expectedFiles.includes(file))
if (missing.length > 0 || unexpected.length > 0) {
  throw new Error(
    `Asset attribution coverage mismatch; missing=[${missing.join(', ')}] unexpected=[${unexpected.join(', ')}]`,
  )
}

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
}

function isHttpsUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.length > 0
  } catch {
    return false
  }
}

for (const asset of attributions.assets) {
  for (const field of ['file', 'publisher', 'providerUrl', 'usagePolicy', 'sha256', 'transformationNotes', 'provenanceStatus']) {
    if (typeof asset[field] !== 'string' || asset[field].trim().length === 0) {
      throw new Error(`Asset attribution ${asset.file ?? '<unknown>'} has invalid ${field}`)
    }
  }
  if (!isHttpsUrl(asset.providerUrl)) {
    throw new Error(`Asset attribution ${asset.file} has invalid providerUrl: ${asset.providerUrl}`)
  }
  if (asset.provenanceStatus !== 'complete') {
    throw new Error(
      `Asset attribution registry contains incomplete provenance records; ${asset.file} has provenanceStatus=${asset.provenanceStatus}`,
    )
  }
  if (!isHttpsUrl(asset.sourcePage)) {
    throw new Error(`Asset attribution ${asset.file} has invalid sourcePage: ${asset.sourcePage}`)
  }
  if (!isIsoDate(asset.retrievedAt)) {
    throw new Error(`Asset attribution ${asset.file} has invalid retrievedAt: ${asset.retrievedAt}`)
  }
  if (!/^[a-f0-9]{64}$/.test(asset.sha256)) {
    throw new Error(`Asset attribution ${asset.file} has invalid SHA-256: ${asset.sha256}`)
  }
  const actualSha256 = createHash('sha256')
    .update(readFileSync(`${publicRoot}/${asset.file}`))
    .digest('hex')
  if (asset.sha256 !== actualSha256) {
    throw new Error(
      `Asset attribution checksum mismatch for ${asset.file}; expected=${asset.sha256} actual=${actualSha256}`,
    )
  }
}

console.log(
  `Asset attribution registry exactly covers ${expectedFiles.length} runtime media files with complete provenance.`,
)
