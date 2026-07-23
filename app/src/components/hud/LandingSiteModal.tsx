import type { LandingSite } from '@/lib/landing-sites'

interface LandingSiteModalProps {
  site: LandingSite
  onClose: () => void
}

export default function LandingSiteModal({ site, onClose }: LandingSiteModalProps) {
  return (
    <div className="pointer-events-auto fixed bottom-24 right-4 z-40 w-[320px] max-w-[calc(100vw-32px)] rounded-2xl border border-amber-500/40 bg-[#0a0e17]/95 p-4 text-slate-100 shadow-[0_0_40px_rgba(245,158,11,0.25)] backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">{site.emoji}</span>
          <div>
            <h3 className="font-mono text-xs font-bold tracking-wide text-amber-200 uppercase">
              {site.nameTr}
            </h3>
            <p className="font-mono text-[10px] text-amber-400/90">{site.name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-400 hover:bg-white/10"
        >
          Kapat ✖
        </button>
      </div>

      {/* Landing Details Grid */}
      <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono mb-3">
        <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-2">
          <div className="text-[8.5px] uppercase tracking-wider text-amber-400/70 mb-0.5">İniş Yılı</div>
          <div className="font-bold text-amber-200">{site.year}</div>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-2">
          <div className="text-[8.5px] uppercase tracking-wider text-amber-400/70 mb-0.5">Uzay Ajansı</div>
          <div className="font-bold text-amber-200 truncate">{site.agencyTr}</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2 col-span-2">
          <div className="text-[8.5px] uppercase tracking-wider text-slate-500 mb-0.5">Yüzey Koordinatı</div>
          <div className="font-mono text-[10px] text-slate-300">
            {Math.abs(site.lat).toFixed(2)}° {site.lat >= 0 ? 'N' : 'S'}, {Math.abs(site.lon).toFixed(2)}° {site.lon >= 0 ? 'E' : 'W'}
          </div>
        </div>
      </div>

      {/* Historical Description */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-2.5 text-[11px] leading-relaxed text-amber-100/90 font-sans">
        🚀 <span className="font-medium text-amber-100">{site.detailsTr}</span>
      </div>
    </div>
  )
}
