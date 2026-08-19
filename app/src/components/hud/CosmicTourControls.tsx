import type { CelestialBodyId } from '@/lib/planets'
import { TOUR_SEQUENCE } from '@/lib/globe-engine'
import type { CinematicTourLanguage } from '@/lib/cinematic-tour'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface CosmicTourControlsProps {
  currentBodyId: CelestialBodyId
  language: CinematicTourLanguage
  isTourActive: boolean
  isAudioReady: boolean
  audioError: string | null
  onLanguageChange: (language: CinematicTourLanguage) => void
  onStartTour: () => void
  onStopTour: () => void
  uiLanguage?: UiLanguage
}

export default function CosmicTourControls({
  currentBodyId,
  language,
  isTourActive,
  isAudioReady,
  audioError,
  onLanguageChange,
  onStartTour,
  onStopTour,
  uiLanguage = 'tr',
}: CosmicTourControlsProps) {
  const currentIndex = TOUR_SEQUENCE.indexOf(currentBodyId)
  const displayStep = currentIndex >= 0 ? currentIndex + 1 : 1
  const canStartTour = isAudioReady && audioError === null
  const languageLabel = language === 'tr' ? 'TR' : 'ENG'
  const t = (tr: string, en: string) => pickLanguage(uiLanguage, tr, en)

  return (
    <div data-hud-surface className="pointer-events-auto flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-[#0a0e17]/85 px-2.5 py-2 md:px-3.5 backdrop-blur-xl shadow-[0_0_25px_rgba(6,182,212,0.25)]">
      {!isTourActive ? (
        <>
          <button
            onClick={onStartTour}
            disabled={!canStartTour}
            className="flex items-center gap-2 font-mono text-xs font-semibold text-cyan-300 transition-all enabled:hover:text-cyan-100 enabled:hover:scale-105 disabled:cursor-not-allowed disabled:text-slate-500"
            title={audioError ?? (isAudioReady ? t('Sinematik Uzay Turunu Başlat', 'Start Cinematic Space Tour') : t('Sinematik ses yükleniyor', 'Loading cinematic narration'))}
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
            </span>
            {/* Full label on desktop, icon-only on mobile */}
            <span className="hidden md:inline tracking-wider uppercase">
              {isAudioReady ? `🚀 ${t('SİNEMATİK UZAY TURUNU BAŞLAT', 'START CINEMATIC SPACE TOUR')}` : `⏳ ${t('SİNEMATİK SES YÜKLENİYOR', 'LOADING CINEMATIC NARRATION')}`}
            </span>
            <span className="md:hidden text-sm">🚀</span>
          </button>
          <div className="flex overflow-hidden rounded-md border border-cyan-400/25 font-mono text-[10px]" role="group" aria-label={t('Sinematik tur dili', 'Cinematic tour language')}>
            {(['tr', 'en'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onLanguageChange(option)}
                className={`px-1.5 py-1 font-semibold transition-colors ${
                  language === option
                    ? 'bg-cyan-400/20 text-cyan-100'
                    : 'text-slate-400 hover:bg-cyan-400/10 hover:text-cyan-200'
                }`}
                aria-pressed={language === option}
                title={option === 'tr' ? t('Türkçe seslendirme', 'Turkish narration') : t('İngilizce seslendirme', 'English narration')}
              >
                {option === 'tr' ? 'TR' : 'ENG'}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Full label on desktop */}
          <span className="hidden md:flex items-center gap-2 text-cyan-200 animate-pulse font-semibold">
            <span className="text-amber-400 text-sm">🎬</span>
            <span>{t('YÖNETMEN ÇEKİMİ:', "DIRECTOR'S CUT:")}</span>
            <span className="text-[10px] text-slate-400">{languageLabel}</span>
            <span className="uppercase text-cyan-400 font-bold tracking-widest">{currentBodyId}</span>
            <span className="text-slate-500 text-[10px]">({displayStep}/{TOUR_SEQUENCE.length})</span>
          </span>
          {/* Compact on mobile */}
          <span className="md:hidden text-cyan-200 animate-pulse font-semibold flex items-center gap-1 text-[10px]">
            <span className="text-amber-400">🎬</span>
            <span className="uppercase text-cyan-400 font-bold">{currentBodyId}</span>
            <span className="text-slate-400">{languageLabel}</span>
            <span className="text-slate-500">({displayStep}/{TOUR_SEQUENCE.length})</span>
          </span>
          <button
            onClick={onStopTour}
            className="rounded-lg border border-rose-500/40 bg-rose-500/20 px-2 py-1 text-[10px] md:text-[11px] font-semibold text-rose-200 hover:bg-rose-500/40 transition-all shadow-[0_0_10px_rgba(244,63,94,0.3)]"
          >
            <span className="hidden md:inline">{t('DURDUR', 'STOP')} </span>⏹️
          </button>
        </div>
      )}
      {audioError && (
        <span className="max-w-48 font-mono text-[10px] leading-tight text-rose-300" role="alert">
          {audioError}
        </span>
      )}
    </div>
  )
}
