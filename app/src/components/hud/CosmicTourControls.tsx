import type { CelestialBodyId } from '@/lib/planets'
import { TOUR_SEQUENCE } from '@/lib/globe-engine'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface CosmicTourControlsProps {
  currentBodyId: CelestialBodyId
  isTourActive: boolean
  onStartTour: () => void
  onStopTour: () => void
  uiLanguage?: UiLanguage
}

export default function CosmicTourControls({
  currentBodyId,
  isTourActive,
  onStartTour,
  onStopTour,
  uiLanguage = 'tr',
}: CosmicTourControlsProps) {
  const currentIndex = TOUR_SEQUENCE.indexOf(currentBodyId)
  const displayStep = currentIndex >= 0 ? currentIndex + 1 : 1
  const t = (tr: string, en: string) => pickLanguage(uiLanguage, tr, en)

  return (
    <div data-hud-surface className="pointer-events-auto flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-[#0a0e17]/85 px-2.5 py-2 md:px-3.5 backdrop-blur-xl shadow-[0_0_25px_rgba(6,182,212,0.25)]">
      {!isTourActive ? (
        <>
          <button
            onClick={onStartTour}
            className="flex items-center gap-2 font-mono text-xs font-semibold text-cyan-300 transition-all hover:scale-105 hover:text-cyan-100"
            title={t('Şematik görsel uzay turunu başlat', 'Start the schematic visual space tour')}
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
            </span>
            {/* Full label on desktop, icon-only on mobile */}
            <span className="hidden md:inline tracking-wider uppercase">
              🚀 {t('GÖRSEL UZAY TURUNU BAŞLAT', 'START VISUAL SPACE TOUR')}
            </span>
            <span className="md:hidden text-sm">🚀</span>
          </button>
        </>
      ) : (
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Full label on desktop */}
          <span className="hidden md:flex items-center gap-2 text-cyan-200 animate-pulse font-semibold">
            <span className="text-amber-400 text-sm">🎬</span>
            <span>{t('YÖNETMEN ÇEKİMİ:', "DIRECTOR'S CUT:")}</span>
            <span className="uppercase text-cyan-400 font-bold tracking-widest">{currentBodyId}</span>
            <span className="text-slate-500 text-[10px]">({displayStep}/{TOUR_SEQUENCE.length})</span>
          </span>
          {/* Compact on mobile */}
          <span className="md:hidden text-cyan-200 animate-pulse font-semibold flex items-center gap-1 text-[10px]">
            <span className="text-amber-400">🎬</span>
            <span className="uppercase text-cyan-400 font-bold">{currentBodyId}</span>
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
    </div>
  )
}
