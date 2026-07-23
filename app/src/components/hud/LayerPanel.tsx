import { UI_GROUPS } from '@/lib/satellites'

interface LayerPanelProps {
  counts: number[]
  visible: boolean[]
  onToggle: (index: number) => void
  focusBody?: 'earth' | 'moon' | 'sun'
  onSelectBody?: (body: 'earth' | 'moon' | 'sun') => void
}

export default function LayerPanel({
  counts,
  visible,
  onToggle,
  focusBody = 'earth',
  onSelectBody,
}: LayerPanelProps) {
  return (
    <div className="pointer-events-auto w-[248px] rounded-xl border border-white/10 bg-[#0a0e14]/70 px-4 py-3.5 backdrop-blur-xl max-md:w-full">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
        Target Body (3D Globe)
      </div>
      <div className="mb-3.5 flex gap-1">
        <button
          onClick={() => onSelectBody?.('earth')}
          className={`flex-1 rounded-lg border py-1.5 font-mono text-[10px] font-medium transition-all ${
            focusBody === 'earth'
              ? 'border-cyan-500/60 bg-cyan-500/20 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
              : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          🌍 Earth
        </button>
        <button
          onClick={() => onSelectBody?.('moon')}
          className={`flex-1 rounded-lg border py-1.5 font-mono text-[10px] font-medium transition-all ${
            focusBody === 'moon'
              ? 'border-amber-500/60 bg-amber-500/20 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
              : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          🌕 Moon
        </button>
        <button
          onClick={() => onSelectBody?.('sun')}
          className={`flex-1 rounded-lg border py-1.5 font-mono text-[10px] font-medium transition-all ${
            focusBody === 'sun'
              ? 'border-orange-500/60 bg-orange-500/20 text-orange-200 shadow-[0_0_10px_rgba(249,115,22,0.3)]'
              : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          ☀️ Sun
        </button>
      </div>

      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
        Layers
      </div>
      <div className="space-y-0.5">
        {UI_GROUPS.map((g, i) => (
          <button
            key={g.key}
            onClick={() => onToggle(i)}
            className={`flex min-h-[32px] w-full items-center gap-2.5 rounded-md px-2 py-1 text-left transition-opacity hover:bg-white/[0.05] ${
              visible[i] ? '' : 'opacity-35'
            }`}
          >
            <span
              className="h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ background: g.color, boxShadow: `0 0 5px ${g.color}66` }}
            />
            <span className="flex-1 truncate text-xs text-slate-300">{g.label}</span>
            <span className="font-mono text-[11px] tabular-nums text-slate-500">
              {(counts[i] ?? 0).toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
