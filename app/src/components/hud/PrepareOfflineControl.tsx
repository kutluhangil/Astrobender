import {
  usePrepareOfflineTextures,
  ERROR_SW_UNSUPPORTED,
  ERROR_SW_NOT_ACTIVE,
  ERROR_STALLED,
} from '@/hooks/usePrepareOfflineTextures'
import { useOfflineStorage } from '@/hooks/useOfflineStorage'
import { formatStorageSize, storageUsagePercent } from '@/lib/offline-storage'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface PrepareOfflineControlProps {
  language: UiLanguage
}

function formatMiB(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MiB`
}

function errorMessage(error: string, language: UiLanguage): string {
  if (error === ERROR_SW_UNSUPPORTED) {
    return pickLanguage(language, 'Service worker desteklenmiyor', 'Service worker not supported')
  }
  if (error === ERROR_SW_NOT_ACTIVE) {
    return pickLanguage(language, 'Service worker henüz aktif değil', 'Service worker not active yet')
  }
  if (error === ERROR_STALLED) {
    return pickLanguage(
      language,
      'İndirme yanıt vermiyor, tekrar deneyin (inen dosyalar korundu)',
      'Download stopped responding, try again (already-downloaded files are kept)',
    )
  }
  if (error.startsWith('offline-download-failed:')) {
    const count = error.split(':')[1]
    return pickLanguage(
      language,
      `${count} dosya indirilemedi; bağlantıyı kontrol edip tekrar deneyin`,
      `${count} files could not be downloaded; check the connection and retry`,
    )
  }
  return error
}

export default function PrepareOfflineControl({ language }: PrepareOfflineControlProps) {
  const { state, start } = usePrepareOfflineTextures()
  const { state: storage, clearOfflineAssets } = useOfflineStorage()
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const usagePercent = storageUsagePercent(storage.usageBytes, storage.quotaBytes)
  const storageSummary = storage.cachedAssetCount === null
    ? pickLanguage(language, 'Çevrimdışı varlıklar hesaplanıyor', 'Counting offline assets')
    : pickLanguage(
      language,
      `${storage.cachedAssetCount} çevrimdışı varlık · ${formatStorageSize(storage.usageBytes, language)} / ${formatStorageSize(storage.quotaBytes, language)}`,
      `${storage.cachedAssetCount} offline assets · ${formatStorageSize(storage.usageBytes, language)} / ${formatStorageSize(storage.quotaBytes, language)}`,
    )

  const storageControl = storage.supported && (
    <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-white/10 pt-1.5 font-mono text-[8px] text-slate-400">
      <span title={storage.error ?? undefined} className="max-w-[144px] leading-snug">{storage.error ? t('Depolama durumu okunamadı', 'Storage status unavailable') : storageSummary}</span>
      <button
        type="button"
        onClick={() => void clearOfflineAssets()}
        disabled={storage.isClearing || storage.cachedAssetCount === 0}
        className="shrink-0 text-cyan-300/80 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {storage.isClearing ? pickLanguage(language, 'Siliniyor…', 'Clearing…') : pickLanguage(language, 'Varlıkları sil', 'Clear assets')}
      </button>
      {usagePercent !== null && <span className="text-slate-500">{usagePercent}%</span>}
    </div>
  )

  if (state.status === 'idle' || state.status === 'error') {
    return (
      <div className="pointer-events-auto fixed bottom-3 right-3 z-30 w-60 rounded-xl border border-cyan-500/25 bg-[#0a0e17]/85 px-2.5 py-2 backdrop-blur-xl">
        <button
          type="button"
          onClick={start}
          className="w-full rounded-lg border border-cyan-500/25 bg-cyan-950/20 px-3 py-2 font-mono text-[10px] font-semibold text-cyan-200"
        >
          {pickLanguage(
            language,
            state.totalBytes
              ? `Çevrimdışı için hazırla (~${formatMiB(state.totalBytes)})`
              : 'Çevrimdışı için hazırla',
            state.totalBytes
              ? `Prepare for offline (~${formatMiB(state.totalBytes)})`
              : 'Prepare for offline',
          )}
        </button>
        {state.status === 'error' && state.error && (
          <p className="mt-1 rounded bg-red-950/80 px-2 py-1 text-[10px] text-red-200">
            {errorMessage(state.error, language)}
          </p>
        )}
        {storageControl}
      </div>
    )
  }

  if (state.status === 'loading-manifest') {
    return (
      <div className="pointer-events-auto fixed bottom-3 right-3 z-30 w-60 rounded-xl border border-cyan-500/25 bg-[#0a0e17]/85 px-3 py-2 font-mono text-[10px] text-cyan-200 backdrop-blur-xl">
        {pickLanguage(language, 'Hazırlanıyor…', 'Preparing…')}
        {storageControl}
      </div>
    )
  }

  if (state.status === 'downloading') {
    const percent = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0
    return (
      <div className="pointer-events-auto fixed bottom-3 right-3 z-30 w-60 rounded-xl border border-cyan-500/25 bg-[#0a0e17]/85 px-3 py-2 font-mono text-[10px] text-cyan-200 backdrop-blur-xl">
        <div>
          {pickLanguage(language, 'İndiriliyor', 'Downloading')} {state.done}/{state.total}
        </div>
        {storageControl}
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-cyan-400" style={{ width: `${percent}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-auto fixed bottom-3 right-3 z-30 w-60 rounded-xl border border-emerald-500/25 bg-[#0a0e17]/85 px-2.5 py-2 backdrop-blur-xl">
      <button
        type="button"
        onClick={start}
        title={pickLanguage(
          language,
          'Yeni bir sürümde eklenmiş olabilecek dokuları indirmek için tekrar çalıştır',
          'Run again to pick up any textures added in a newer deploy',
        )}
        className="w-full rounded-lg border border-emerald-500/25 bg-emerald-950/15 px-3 py-2 font-mono text-[10px] text-emerald-200"
      >
        {pickLanguage(language, 'Çevrimdışı için hazır ✓', 'Ready for offline ✓')}
      </button>
      {storageControl}
    </div>
  )
}
