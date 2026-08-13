import type { UiLanguage } from './ui-language.ts'

export type EvidenceClass =
  | 'live'
  | 'calculated'
  | 'sourced-static'
  | 'schematic'
  | 'heuristic'

export interface EvidenceRecord {
  evidenceClass: EvidenceClass
  publisher: string
  sourceUrl: string
  retrievedAt?: string
  verifiedAt: string
  method?: string
  epoch?: string
  validFrom?: string
  validUntil?: string
  uncertainty?: string
  limitation?: string
}

export const EVIDENCE_CLASS_PRESENTATION: Record<
  EvidenceClass,
  {
    shortLabel: string
    color: string
    symbol: string
    label: Record<UiLanguage, string>
  }
> = {
  live: {
    shortLabel: 'LIVE',
    color: '#6EE7C1',
    symbol: '●',
    label: { tr: 'Canlı kaynak', en: 'Live source' },
  },
  calculated: {
    shortLabel: 'CALC',
    color: '#7DD3FC',
    symbol: '◇',
    label: { tr: 'Hesaplanan', en: 'Calculated' },
  },
  'sourced-static': {
    shortLabel: 'SOURCE',
    color: '#C4B5FD',
    symbol: '■',
    label: { tr: 'Kaynaklı statik', en: 'Sourced static' },
  },
  schematic: {
    shortLabel: 'SCHEMATIC',
    color: '#F6C86A',
    symbol: '△',
    label: { tr: 'Şematik', en: 'Schematic' },
  },
  heuristic: {
    shortLabel: 'HEURISTIC',
    color: '#FDBA74',
    symbol: '≈',
    label: { tr: 'Ürün sezgisi', en: 'Product heuristic' },
  },
}

export function getActiveSceneEvidenceClasses(input: {
  schematicActive: boolean
  heuristicActive: boolean
}): Array<Extract<EvidenceClass, 'schematic' | 'heuristic'>> {
  return [
    ...(input.schematicActive ? ['schematic' as const] : []),
    ...(input.heuristicActive ? ['heuristic' as const] : []),
  ]
}

function parseIsoDate(value: string): number | null {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    const parsed = Date.UTC(Number(year), Number(month) - 1, Number(day))
    const date = new Date(parsed)
    return date.getUTCFullYear() === Number(year)
      && date.getUTCMonth() === Number(month) - 1
      && date.getUTCDate() === Number(day)
      ? parsed
      : null
  }
  const dateTimeMatch = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?Z$/.exec(value)
  if (!dateTimeMatch) {
    return null
  }
  const [, year, month, day, hour, minute, second = '0', millisecond = '0'] = dateTimeMatch
  const parsed = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number(millisecond),
  )
  const date = new Date(parsed)
  return date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day)
    && date.getUTCHours() === Number(hour)
    && date.getUTCMinutes() === Number(minute)
    && date.getUTCSeconds() === Number(second)
    && date.getUTCMilliseconds() === Number(millisecond)
    ? parsed
    : null
}

function requireIsoDate(
  record: EvidenceRecord,
  field: keyof EvidenceRecord,
  required = false,
): number | null {
  const value = record[field]
  if (value === undefined) {
    if (required) throw new Error(`${field} is required`)
    return null
  }
  if (typeof value !== 'string' || parseIsoDate(value) === null) {
    throw new Error(`${field} must be a valid ISO date; received ${String(value)}`)
  }
  return parseIsoDate(value)
}

function isHttpsSourceUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.length > 0
  } catch {
    return false
  }
}

export function validateEvidenceRecord(record: EvidenceRecord): EvidenceRecord {
  if (!Object.hasOwn(EVIDENCE_CLASS_PRESENTATION, record.evidenceClass)) {
    throw new Error(`Unknown evidenceClass: ${String(record.evidenceClass)}`)
  }
  if (!record.publisher.trim()) {
    throw new Error(`${record.evidenceClass} evidence requires a publisher`)
  }
  if (record.evidenceClass !== 'schematic' && !record.sourceUrl.trim()) {
    throw new Error(`${record.evidenceClass} evidence requires a source URL`)
  }
  if (record.sourceUrl && !isHttpsSourceUrl(record.sourceUrl)) {
    throw new Error(`sourceUrl must be an HTTPS URL; received ${record.sourceUrl}`)
  }
  if (record.evidenceClass === 'live' && !record.retrievedAt) {
    throw new Error('Live evidence requires retrievedAt')
  }
  if (record.evidenceClass === 'calculated' && !record.method?.trim()) {
    throw new Error('Calculated evidence requires method')
  }
  if (record.evidenceClass === 'calculated' && !record.epoch) {
    throw new Error('Calculated evidence requires epoch')
  }
  requireIsoDate(record, 'verifiedAt', true)
  requireIsoDate(record, 'retrievedAt')
  requireIsoDate(record, 'epoch')
  const validFrom = requireIsoDate(record, 'validFrom')
  const validUntil = requireIsoDate(record, 'validUntil')
  if (validFrom !== null && validUntil !== null && validUntil < validFrom) {
    throw new Error('validUntil must not precede validFrom')
  }
  return record
}

export function formatEvidenceFreshness(
  record: EvidenceRecord,
  language: UiLanguage,
  nowMs = Date.now(),
): string {
  validateEvidenceRecord(record)
  if (record.evidenceClass === 'live' && record.retrievedAt) {
    const ageMinutes = Math.max(0, Math.floor((nowMs - Date.parse(record.retrievedAt)) / 60_000))
    if (ageMinutes < 1) return language === 'tr' ? 'şimdi' : 'now'
    if (ageMinutes < 60) return language === 'tr' ? `${ageMinutes} dk` : `${ageMinutes}m`
    const ageHours = Math.floor(ageMinutes / 60)
    return language === 'tr' ? `${ageHours} sa` : `${ageHours}h`
  }
  if (record.evidenceClass === 'calculated' && record.epoch) {
    return record.epoch.replace('T', ' ').replace(/:\d{2}(?:\.\d{3})?Z$/, 'Z')
  }
  if (record.evidenceClass === 'sourced-static') {
    return language === 'tr'
      ? `${record.verifiedAt.slice(0, 4)} doğrulandı`
      : `reviewed ${record.verifiedAt.slice(0, 4)}`
  }
  return EVIDENCE_CLASS_PRESENTATION[record.evidenceClass].label[language]
}

export function createTlePropagationEvidence(input: {
  epochMs: number
  fetchedAt: number
  source: 'live' | 'cached' | 'snapshot'
}): EvidenceRecord {
  if (!Number.isFinite(input.epochMs) || input.epochMs <= 0) {
    throw new Error(`TLE evidence requires a valid epoch; received ${input.epochMs}`)
  }
  if (!Number.isFinite(input.fetchedAt) || input.fetchedAt <= 0) {
    throw new Error(`TLE evidence requires a valid retrieval time; received ${input.fetchedAt}`)
  }
  return validateEvidenceRecord({
    evidenceClass: 'calculated',
    publisher: 'CelesTrak',
    sourceUrl: 'https://celestrak.org/NORAD/elements/',
    retrievedAt: new Date(input.fetchedAt).toISOString(),
    verifiedAt: '2026-07-26',
    method: 'SGP4 via satellite.js 6.0.0',
    epoch: new Date(input.epochMs).toISOString(),
    uncertainty: 'Not published as a single value; accuracy degrades as the TLE epoch ages.',
    limitation: input.source === 'live'
      ? 'Positions are propagated from the current validated TLE payload.'
      : `Positions are propagated from a ${input.source} TLE payload, not a live measurement.`,
  })
}

export function validateEvidenceRegistry(
  groups: readonly { id: string; evidence: EvidenceRecord }[],
  nowMs = Date.now(),
  maxAgeDays = 120,
): { checked: number; oldestAgeDays: number } {
  if (groups.length === 0) throw new Error('Evidence registry contains no groups')
  if (!Number.isFinite(nowMs) || !Number.isInteger(maxAgeDays) || maxAgeDays < 0) {
    throw new Error(`Evidence registry freshness inputs are invalid; nowMs=${nowMs} maxAgeDays=${maxAgeDays}`)
  }
  let oldestAgeDays = 0
  for (const group of groups) {
    if (!group.id.trim()) throw new Error('Evidence registry group id must not be empty')
    validateEvidenceRecord(group.evidence)
    const verifiedAtMs = parseIsoDate(group.evidence.verifiedAt)
    if (verifiedAtMs === null) {
      throw new Error(`${group.id} has an invalid verifiedAt date: ${group.evidence.verifiedAt}`)
    }
    const ageDays = Math.max(0, Math.floor((nowMs - verifiedAtMs) / 86_400_000))
    oldestAgeDays = Math.max(oldestAgeDays, ageDays)
    if (ageDays > maxAgeDays) {
      throw new Error(
        `${group.id} evidence review is overdue: ${ageDays} days old (maximum ${maxAgeDays})`,
      )
    }
  }
  return { checked: groups.length, oldestAgeDays }
}

export function createPerseidHeuristicEvidence(observedAt: string): EvidenceRecord {
  return validateEvidenceRecord({
    evidenceClass: 'heuristic',
    publisher: 'ASTROBENDER',
    sourceUrl: 'https://github.com/kutluhangil/Astrobender/blob/main/app/src/lib/perseid-watch.ts',
    verifiedAt: '2026-08-13',
    method: 'Product heuristic using radiant altitude, Sun altitude, and Moon illumination',
    epoch: observedAt,
    uncertainty: 'No scientific uncertainty is defined for this product-authored score.',
    limitation: 'Not a scientific measurement; cloud cover, transparency, light pollution, and local obstructions are excluded.',
  })
}
