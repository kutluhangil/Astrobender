import { readFileSync } from 'node:fs'

const catalogPath = new URL('../src/lib/celestial-catalog.ts', import.meta.url)
const catalogSource = readFileSync(catalogPath, 'utf8')
const match = catalogSource.match(/verifiedAt:\s*CATALOG_VERIFIED_AT/)
const dateMatch = catalogSource.match(/import\s+\{\s*CATALOG_VERIFIED_AT\s*\}\s+from\s+['"][^'"]+source-governance\.ts['"]/)

if (!match || !dateMatch) {
  throw new Error('Catalog source governance wiring is missing from celestial-catalog.ts')
}

const governancePath = new URL('../src/lib/source-governance.ts', import.meta.url)
const governanceSource = readFileSync(governancePath, 'utf8')
const verifiedMatch = governanceSource.match(/CATALOG_VERIFIED_AT\s*=\s*'(\d{4}-\d{2}-\d{2})'/)
const maxAgeMatch = governanceSource.match(/SOURCE_REVIEW_MAX_AGE_DAYS\s*=\s*(\d+)/)

if (!verifiedMatch || !maxAgeMatch) {
  throw new Error('Source governance date or review window is missing')
}

const verifiedAtMs = Date.parse(`${verifiedMatch[1]}T00:00:00Z`)
const maxAgeDays = Number(maxAgeMatch[1])
if (!Number.isFinite(verifiedAtMs) || !Number.isInteger(maxAgeDays) || maxAgeDays < 0) {
  throw new Error('Source governance configuration is invalid')
}

const ageDays = Math.max(0, Math.floor((Date.now() - verifiedAtMs) / 86_400_000))
if (ageDays > maxAgeDays) {
  throw new Error(
    `Celestial catalog source review is overdue: ${ageDays} days old (maximum ${maxAgeDays}). Update CATALOG_VERIFIED_AT after reviewing primary sources.`,
  )
}

console.log(`Celestial catalog source review is current: ${ageDays}/${maxAgeDays} days.`)
