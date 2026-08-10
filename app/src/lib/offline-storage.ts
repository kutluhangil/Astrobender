export const OFFLINE_RUNTIME_CACHES = [
  'astrobender-textures-v1',
  'astrobender-audio-v1',
] as const

export function formatStorageSize(bytes: number | null, language: 'tr' | 'en'): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) {
    return language === 'tr' ? 'Bilinmiyor' : 'Unknown'
  }

  const mib = bytes / 1024 / 1024
  return `${mib >= 1024 ? (mib / 1024).toFixed(1) + ' GiB' : Math.round(mib) + ' MiB'}`
}

export function storageUsagePercent(usageBytes: number | null, quotaBytes: number | null): number | null {
  if (usageBytes === null || quotaBytes === null || quotaBytes <= 0) return null
  return Math.min(100, Math.round((usageBytes / quotaBytes) * 100))
}
