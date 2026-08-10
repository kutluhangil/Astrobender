import type { DataSource } from './satellites'

export const DAY_MS = 24 * 60 * 60 * 1000
const FRESH_MAX_AGE_MS = 3 * DAY_MS
const AGING_MAX_AGE_MS = 14 * DAY_MS

export type TleFreshnessSeverity = 'fresh' | 'aging' | 'stale' | 'unknown'

export interface TleFreshness {
  ageMs: number | null
  severity: TleFreshnessSeverity
  source: DataSource
}

export function describeTleFreshness(
  input: Pick<TleFreshness, 'source'> & { epochMs: number },
  nowMs: number,
): TleFreshness {
  const ageMs = nowMs - input.epochMs
  if (!Number.isFinite(input.epochMs) || input.epochMs <= 0 || ageMs < 0) {
    return { ageMs: null, severity: 'unknown', source: input.source }
  }
  if (ageMs <= FRESH_MAX_AGE_MS) return { ageMs, severity: 'fresh', source: input.source }
  if (ageMs <= AGING_MAX_AGE_MS) return { ageMs, severity: 'aging', source: input.source }
  return { ageMs, severity: 'stale', source: input.source }
}
