import { useState } from 'react'
import { CELESTIAL_FACTS } from '@/lib/celestial-facts'
import type { CelestialBodyId } from '@/lib/planets'

interface PlanetInfoCardProps {
  bodyId: CelestialBodyId
  /** Mobile: whether the card is expanded (controlled from Home) */
  mobileExpanded?: boolean
  onMobileToggle?: () => void
}

export default function PlanetInfoCard({ bodyId, mobileExpanded = false, onMobileToggle }: PlanetInfoCardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const fact = CELESTIAL_FACTS[bodyId]
  if (!fact) return null

  return (
    <>
      {/* ===== DESKTOP: always visible top-right panel ===== */}
      <div className="hidden md:block pointer-events-auto w-[310px] max-w-[calc(100vw-32px)] rounded-2xl border border-cyan-500/20 bg-[#0a0e17]/90 p-3.5 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">{fact.emoji}</span>
            <div>
              <h3 className="font-mono text-sm font-bold tracking-wide text-cyan-100 uppercase">
                {fact.nameTr} <span className="text-[10px] font-normal text-slate-400">({fact.name})</span>
              </h3>
              <p className="font-mono text-[9.5px] text-cyan-400/90">{fact.typeTr}</p>
            </div>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Gezegen bilgi kartını genişlet' : 'Gezegen bilgi kartını daralt'}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-300 hover:bg-white/10"
          >
            {collapsed ? '➕' : '➖'}
          </button>
        </div>

        {!collapsed && (
          <>
            <div className="grid grid-cols-2 gap-1.5 text-[10.5px] font-mono mb-2.5">
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-1.5">
                <div className="text-[8.5px] uppercase tracking-wider text-slate-500 mb-0.5">Yarıçap</div>
                <div className="font-medium text-slate-200 truncate">{fact.radiusKm}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-1.5">
                <div className="text-[8.5px] uppercase tracking-wider text-slate-500 mb-0.5">Güneş'e Uzaklık</div>
                <div className="font-medium text-slate-200 truncate">{fact.distFromSunAu}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-1.5">
                <div className="text-[8.5px] uppercase tracking-wider text-slate-500 mb-0.5">Eksen Dönüşü</div>
                <div className="font-medium text-slate-200 truncate">{fact.rotationPeriod}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-1.5">
                <div className="text-[8.5px] uppercase tracking-wider text-slate-500 mb-0.5">Yörünge Periyodu</div>
                <div className="font-medium text-slate-200 truncate">{fact.orbitPeriod}</div>
              </div>
            </div>
            <div className="space-y-1 text-[10.5px] font-mono mb-2.5">
              <div className="flex items-center justify-between text-slate-400">
                <span>Uydu Sayısı:</span>
                <span className="text-cyan-300 font-semibold">{fact.moonsCount}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Atmosfer:</span>
                <span className="text-slate-200 truncate max-w-[150px] text-right">{fact.atmosphere}</span>
              </div>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/30 p-2 text-[10px] leading-relaxed text-cyan-200/90 font-sans">
              💡 <span className="font-medium text-cyan-100">{fact.funFactTr}</span>
            </div>
          </>
        )}
      </div>

      {/* ===== MOBILE: slide-up card when expanded ===== */}
      {mobileExpanded && (
        <div className="md:hidden pointer-events-auto fixed bottom-[148px] left-3 right-3 z-30 rounded-2xl border border-cyan-500/20 bg-[#0a0e17]/95 p-3.5 shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{fact.emoji}</span>
              <div>
                <h3 className="font-mono text-xs font-bold tracking-wide text-cyan-100 uppercase">
                  {fact.nameTr} <span className="text-[9px] font-normal text-slate-400">({fact.name})</span>
                </h3>
                <p className="font-mono text-[9px] text-cyan-400/90">{fact.typeTr}</p>
              </div>
            </div>
            <button
              onClick={onMobileToggle}
              aria-label="Gezegen bilgi kartını kapat"
              className="rounded-full border border-white/10 bg-white/10 p-1.5 text-slate-300 hover:bg-white/20"
            >
              <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 stroke-current" strokeWidth="1.5">
                <path d="M1 1l8 8M9 1l-8 8" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono mb-2">
            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-1.5">
              <div className="text-[8px] uppercase tracking-wider text-slate-500 mb-0.5">Yarıçap</div>
              <div className="font-medium text-slate-200 truncate">{fact.radiusKm}</div>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-1.5">
              <div className="text-[8px] uppercase tracking-wider text-slate-500 mb-0.5">Güneş'e Uzaklık</div>
              <div className="font-medium text-slate-200 truncate">{fact.distFromSunAu}</div>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-1.5">
              <div className="text-[8px] uppercase tracking-wider text-slate-500 mb-0.5">Eksen Dönüşü</div>
              <div className="font-medium text-slate-200 truncate">{fact.rotationPeriod}</div>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-1.5">
              <div className="text-[8px] uppercase tracking-wider text-slate-500 mb-0.5">Yörünge Periyodu</div>
              <div className="font-medium text-slate-200 truncate">{fact.orbitPeriod}</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span>Atmosfer:</span>
            <span className="text-slate-200 truncate max-w-[160px] text-right">{fact.atmosphere}</span>
          </div>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/30 p-2 text-[9.5px] leading-relaxed text-cyan-200/90 font-sans">
            💡 <span className="font-medium text-cyan-100">{fact.funFactTr}</span>
          </div>
        </div>
      )}
    </>
  )
}
