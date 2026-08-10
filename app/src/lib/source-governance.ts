export const CATALOG_VERIFIED_AT = '2026-07-26'
export const SOURCE_REVIEW_MAX_AGE_DAYS = 120

export type SourceReviewState = 'current' | 'review-required' | 'invalid'

export interface SourceFreshness {
  ageDays: number | null
  state: SourceReviewState
}

function parseUtcDate(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const parsed = Date.parse(`${date}T00:00:00Z`)
  return Number.isFinite(parsed) ? parsed : null
}

export function getSourceFreshness(
  verifiedAt: string,
  nowMs = Date.now(),
  maxAgeDays = SOURCE_REVIEW_MAX_AGE_DAYS,
): SourceFreshness {
  const verifiedAtMs = parseUtcDate(verifiedAt)
  if (verifiedAtMs === null || !Number.isFinite(nowMs) || maxAgeDays < 0) {
    return { ageDays: null, state: 'invalid' }
  }

  const ageDays = Math.max(0, Math.floor((nowMs - verifiedAtMs) / 86_400_000))
  return {
    ageDays,
    state: ageDays > maxAgeDays ? 'review-required' : 'current',
  }
}

export function formatSourceReviewStatus(freshness: SourceFreshness, language: 'tr' | 'en'): string {
  if (freshness.state === 'invalid') {
    return language === 'tr' ? 'Tarih doğrulanamadı' : 'Date could not be verified'
  }

  if (freshness.state === 'review-required') {
    return language === 'tr'
      ? `Kaynak incelemesi gerekli · ${freshness.ageDays} gün`
      : `Source review required · ${freshness.ageDays} days`
  }

  return language === 'tr'
    ? `Kaynak doğrulandı · ${freshness.ageDays} gün önce`
    : `Source verified · ${freshness.ageDays} days ago`
}
