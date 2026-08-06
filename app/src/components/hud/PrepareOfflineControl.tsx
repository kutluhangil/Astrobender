import {
  usePrepareOfflineTextures,
  ERROR_SW_UNSUPPORTED,
  ERROR_SW_NOT_ACTIVE,
} from '@/hooks/usePrepareOfflineTextures'
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
  return error
}

export default function PrepareOfflineControl({ language }: PrepareOfflineControlProps) {
  const { state, start } = usePrepareOfflineTextures()

  if (state.status === 'idle' || state.status === 'error') {
    return (
      <div className="pointer-events-auto fixed bottom-3 right-3 z-30">
        <button
          type="button"
          onClick={start}
          className="rounded-xl border border-cyan-500/25 bg-[#0a0e17]/85 px-3 py-2 font-mono text-[10px] font-semibold text-cyan-200 backdrop-blur-xl"
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
      </div>
    )
  }

  if (state.status === 'loading-manifest') {
    return (
      <div className="pointer-events-auto fixed bottom-3 right-3 z-30 rounded-xl border border-cyan-500/25 bg-[#0a0e17]/85 px-3 py-2 font-mono text-[10px] text-cyan-200 backdrop-blur-xl">
        {pickLanguage(language, 'Hazırlanıyor…', 'Preparing…')}
      </div>
    )
  }

  if (state.status === 'downloading') {
    const percent = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0
    return (
      <div className="pointer-events-auto fixed bottom-3 right-3 z-30 w-52 rounded-xl border border-cyan-500/25 bg-[#0a0e17]/85 px-3 py-2 font-mono text-[10px] text-cyan-200 backdrop-blur-xl">
        <div>
          {pickLanguage(language, 'İndiriliyor', 'Downloading')} {state.done}/{state.total}
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-cyan-400" style={{ width: `${percent}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-auto fixed bottom-3 right-3 z-30 rounded-xl border border-emerald-500/25 bg-[#0a0e17]/85 px-3 py-2 font-mono text-[10px] text-emerald-200 backdrop-blur-xl">
      {pickLanguage(language, 'Çevrimdışı için hazır ✓', 'Ready for offline ✓')}
    </div>
  )
}
