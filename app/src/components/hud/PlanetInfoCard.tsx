import { CELESTIAL_FACTS } from '@/lib/celestial-facts'
import type { CelestialBodyId } from '@/lib/planets'

interface PlanetInfoCardProps {
  bodyId: CelestialBodyId
  onClose?: () => void
}

export default function PlanetInfoCard({ bodyId }: PlanetInfoCardProps) {
  const fact = CELESTIAL_FACTS[bodyId]
  if (!fact) return null

  return (
    <div className="pointer-events-auto w-[310px] rounded-2xl border border-cyan-500/20 bg-[#0a0e17]/85 p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all animate-in fade-in slide-in-from-right-4 duration-300 max-sm:w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">{fact.emoji}</span>
          <div>
            <h3 className="font-mono text-sm font-bold tracking-wide text-cyan-100 uppercase">
              {fact.nameTr} <span className="text-[11px] font-normal text-slate-400">({fact.name})</span>
            </h3>
            <p className="font-mono text-[10px] text-cyan-400/90">{fact.typeTr}</p>
          </div>
        </div>
      </div>

      {/* Grid Properties */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mb-3">
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-0.5">Yarıçap</div>
          <div className="font-medium text-slate-200 truncate">{fact.radiusKm}</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-0.5">Güneş'e Uzaklık</div>
          <div className="font-medium text-slate-200 truncate">{fact.distFromSunAu}</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-0.5">Eksen Dönüşü</div>
          <div className="font-medium text-slate-200 truncate">{fact.rotationPeriod}</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-0.5">Yörünge Periyodu</div>
          <div className="font-medium text-slate-200 truncate">{fact.orbitPeriod}</div>
        </div>
      </div>

      {/* Atmosphere & Moons */}
      <div className="space-y-1.5 text-[11px] font-mono mb-3">
        <div className="flex items-center justify-between text-slate-400">
          <span>Uydu Sayısı:</span>
          <span className="text-cyan-300 font-semibold">{fact.moonsCount}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Atmosfer:</span>
          <span className="text-slate-200 truncate max-w-[170px] text-right">{fact.atmosphere}</span>
        </div>
      </div>

      {/* Fun Fact Footer */}
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/30 p-2.5 text-[10.5px] leading-relaxed text-cyan-200/90 font-sans">
        💡 <span className="font-medium text-cyan-100">{fact.funFactTr}</span>
      </div>
    </div>
  )
}
