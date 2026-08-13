import {
  usePrepareOfflineTextures,
  ERROR_SW_UNSUPPORTED,
  ERROR_SW_NOT_ACTIVE,
} from '@/hooks/usePrepareOfflineTextures'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface PrepareOfflineControlProps {
  language: UiLanguage
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
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)

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
            'Çevrimdışı uygulama kabuğunu doğrula',
            'Confirm offline app shell',
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

  return (
    <div className="pointer-events-auto fixed bottom-3 right-3 z-30 w-60 rounded-xl border border-emerald-500/25 bg-[#0a0e17]/85 px-2.5 py-2 backdrop-blur-xl">
      <button
        type="button"
        onClick={start}
        title={t('Uygulama kabuğu çevrimdışı kullanıma hazır. Paketlenmiş medya yoktur.', 'The app shell is ready for offline use. No media is bundled.')}
        className="w-full rounded-lg border border-emerald-500/25 bg-emerald-950/15 px-3 py-2 font-mono text-[10px] text-emerald-200"
      >
        {pickLanguage(language, 'Çevrimdışı kabuk hazır ✓', 'Offline shell ready ✓')}
      </button>
      <p className="mt-1 font-mono text-[8px] leading-snug text-slate-400">
        {t('Şematik görseller kod içinde üretilir; indirilecek medya yoktur.', 'Schematic visuals are generated in code; there is no media to download.')}
      </p>
    </div>
  )
}
