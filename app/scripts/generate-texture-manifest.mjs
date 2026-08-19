import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const texturesDir = join(__dirname, '..', 'public', 'textures')
const outDir = join(__dirname, '..', 'public', 'data')
const outPath = join(outDir, 'texture-manifest.json')

const files = readdirSync(texturesDir)
  .filter((name) => !name.startsWith('.'))
  .sort()
  .map((name) => ({ file: name, bytes: statSync(join(texturesDir, name)).size }))

const totalBytes = files.reduce((sum, entry) => sum + entry.bytes, 0)

mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, JSON.stringify({ totalBytes, files }, null, 2) + '\n')

console.log(
  `Wrote ${files.length} entries (${(totalBytes / 1024 / 1024).toFixed(1)} MiB) to ${outPath}`,
)
