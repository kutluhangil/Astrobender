import { useState } from 'react'
import type { CelestialBodyId } from '@/lib/planets'
import { TOUR_SEQUENCE } from '@/lib/globe-engine'

interface CosmicTourControlsProps {
  onSelectBody: (bodyId: CelestialBodyId) => void
  currentBodyId: CelestialBodyId
  onStartTour?: () => void
  onStopTour?: () => void
}

export default function CosmicTourControls({
  currentBodyId,
  onStartTour,
  onStopTour,
}: CosmicTourControlsProps) {
  const [isTourActive, setIsTourActive] = useState(false)

  const currentIndex = TOUR_SEQUENCE.indexOf(currentBodyId)
  const displayStep = currentIndex >= 0 ? currentIndex + 1 : 1

  const handleStartTour = () => {
    setIsTourActive(true)
    onStartTour?.()
  }

  const handleStopTour = () => {
    setIsTourActive(false)
    onStopTour?.()
  }

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-[#0a0e17]/85 px-3.5 py-2 backdrop-blur-xl shadow-[0_0_25px_rgba(6,182,212,0.25)]">
      {!isTourActive ? (
        <button
          onClick={handleStartTour}
          className="flex items-center gap-2.5 font-mono text-xs font-semibold text-cyan-300 hover:text-cyan-100 transition-all hover:scale-105"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
          </span>
          <span className="tracking-wider uppercase">🚀 SİNEMATİK UZAY TURUNU BAŞLAT</span>
        </button>
      ) : (
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="text-cyan-200 animate-pulse font-semibold flex items-center gap-2">
            <span className="text-amber-400 text-sm">🎬</span>
            <span>YÖNETMEN ÇEKİMİ:</span>
            <span className="uppercase text-cyan-400 font-bold tracking-widest">{currentBodyId}</span>
            <span className="text-slate-500 text-[10px]">({displayStep}/{TOUR_SEQUENCE.length})</span>
          </span>
          <button
            onClick={handleStopTour}
            className="rounded-lg border border-rose-500/40 bg-rose-500/20 px-2.5 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/40 transition-all shadow-[0_0_10px_rgba(244,63,94,0.3)]"
          >
            DURDUR ⏹️
          </button>
        </div>
      )}
    </div>
  )
}
