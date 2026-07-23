import { UI_GROUPS } from '@/lib/satellites'
import { PLANETS, type CelestialBodyId, findPlanetDef } from '@/lib/planets'
import { useState } from 'react'

interface LayerPanelProps {
  counts: number[]
  visible: boolean[]
  onToggle: (index: number) => void
  focusBody?: CelestialBodyId
  onSelectBody?: (body: CelestialBodyId) => void
  onToggleScaleSandbox?: () => void
  onToggleAudio?: () => void
  audioPlaying?: boolean
  onTogglePlanetaryOrbits?: () => void
  planetaryOrbitsVisible?: boolean
  onToggleProbes?: () => void
  probesVisible?: boolean
  onToggleConstellations?: () => void
  constellationsVisible?: boolean
}

const PRIMARY_BODIES: { id: CelestialBodyId; name: string; emoji: string; activeClass: string }[] = [
  { id: 'earth', name: 'Earth', emoji: '🌍', activeClass: 'border-cyan-500/60 bg-cyan-500/20 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]' },
  { id: 'moon', name: 'Moon', emoji: '🌕', activeClass: 'border-amber-500/60 bg-amber-500/20 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.3)]' },
  { id: 'sun', name: 'Sun', emoji: '☀️', activeClass: 'border-orange-500/60 bg-orange-500/20 text-orange-200 shadow-[0_0_10px_rgba(249,115,22,0.3)]' },
]

export default function LayerPanel({
  counts,
  visible,
  onToggle,
  focusBody = 'earth',
  onSelectBody,
  onToggleScaleSandbox,
  onToggleAudio,
  audioPlaying = false,
  onTogglePlanetaryOrbits,
  planetaryOrbitsVisible = false,
  onToggleProbes,
  probesVisible = false,
  onToggleConstellations,
  constellationsVisible = false,
}: LayerPanelProps) {
  const [showAllPlanets, setShowAllPlanets] = useState(true)
  const [showCosmicEnv, setShowCosmicEnv] = useState(false)

  const currentDef = findPlanetDef(focusBody)
  const currentLabel = focusBody === 'earth' ? '🌍 Earth' : focusBody === 'moon' ? '🌕 Moon' : focusBody === 'sun' ? '☀️ Sun' : currentDef ? `${currentDef.emoji} ${currentDef.name}` : focusBody

  return (
    <div className="pointer-events-auto w-[248px] rounded-xl border border-white/10 bg-[#0a0e14]/80 px-4 py-3.5 backdrop-blur-xl max-md:w-full space-y-3">
      {/* Top Utility Controls */}
      <div className="flex gap-1">
        <button
          onClick={onToggleScaleSandbox}
          className="flex-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 py-1 font-mono text-[9.5px] font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-all"
        >
          ⚖️ Scale Sandbox
        </button>
        <button
          onClick={onToggleAudio}
          className={`px-2.5 rounded-md border py-1 font-mono text-[10px] transition-all ${
            audioPlaying
              ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
              : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          {audioPlaying ? '🔊 Ambient On' : '🔇 Mute'}
        </button>
      </div>

      {/* Target Body Header */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
            Target Body (3D Globe)
          </div>
          <button
            onClick={() => setShowAllPlanets(!showAllPlanets)}
            className="font-mono text-[9px] text-cyan-400 hover:text-cyan-300 underline"
          >
            {showAllPlanets ? 'Compact' : 'Solar System 🪐'}
          </button>
        </div>

        {/* Primary Quick Selector */}
        <div className="mb-2 flex gap-1">
          {PRIMARY_BODIES.map((b) => (
            <button
              key={b.id}
              onClick={() => onSelectBody?.(b.id)}
              className={`flex-1 rounded-lg border py-1.5 font-mono text-[10px] font-medium transition-all ${
                focusBody === b.id
                  ? b.activeClass
                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {b.emoji} {b.name}
            </button>
          ))}
        </div>

        {/* Expanded Solar System Grid */}
        {showAllPlanets && (
          <div className="max-h-[160px] overflow-y-auto space-y-1 pr-1 text-[11px] scrollbar-thin scrollbar-thumb-white/10">
            {PLANETS.map((p) => (
              <div key={p.id} className="space-y-0.5">
                <button
                  onClick={() => onSelectBody?.(p.id)}
                  className={`w-full flex items-center justify-between rounded-md border px-2 py-1 transition-all ${
                    focusBody === p.id
                      ? p.uiColor + ' ' + p.uiGlow
                      : 'border-white/5 bg-white/[0.03] text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>{p.emoji} {p.name}</span>
                  <span className="font-mono text-[9px] text-slate-500">{p.orbitRadius} AU</span>
                </button>

                {/* Moons */}
                {p.moons && p.moons.length > 0 && (
                  <div className="pl-3 grid grid-cols-2 gap-1">
                    {p.moons.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => onSelectBody?.(m.id)}
                        className={`truncate rounded px-1.5 py-0.5 text-[9.5px] font-mono border text-left transition-all ${
                          focusBody === m.id
                            ? 'border-cyan-400/60 bg-cyan-400/20 text-cyan-200'
                            : 'border-white/5 bg-white/[0.02] text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {m.emoji} {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!showAllPlanets && focusBody !== 'earth' && focusBody !== 'moon' && focusBody !== 'sun' && (
          <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 font-mono text-[11px] text-cyan-200 flex items-center justify-between">
            <span>Active Target:</span>
            <span className="font-semibold">{currentLabel}</span>
          </div>
        )}
      </div>

      {/* Cosmic Layers Toggles (Closed by default) */}
      <div className="border-t border-white/5 pt-2">
        <div className="flex items-center justify-between mb-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
            Cosmic Environments
          </div>
          <button
            onClick={() => setShowCosmicEnv(!showCosmicEnv)}
            className="font-mono text-[9px] text-cyan-400 hover:text-cyan-300 underline"
          >
            {showCosmicEnv ? 'Hide ➖' : 'Expand ➕'}
          </button>
        </div>

        {showCosmicEnv && (
          <div className="grid grid-cols-3 gap-1 font-mono text-[9px] mt-1.5 animate-in fade-in duration-200">
            <button
              onClick={onTogglePlanetaryOrbits}
              className={`py-1 rounded border transition-all ${
                planetaryOrbitsVisible ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-200' : 'border-white/5 bg-white/5 text-slate-500'
              }`}
            >
              🪐 Orbits
            </button>
            <button
              onClick={onToggleProbes}
              className={`py-1 rounded border transition-all ${
                probesVisible ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-200' : 'border-white/5 bg-white/5 text-slate-500'
              }`}
            >
              🛰️ Probes
            </button>
            <button
              onClick={onToggleConstellations}
              className={`py-1 rounded border transition-all ${
                constellationsVisible ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-200' : 'border-white/5 bg-white/5 text-slate-500'
              }`}
            >
              ✨ Stars
            </button>
          </div>
        )}
      </div>

      {/* Satellite Layers */}
      <div>
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
          Earth Satellites
        </div>
        <div className="space-y-0.5 max-h-[140px] overflow-y-auto pr-1">
          {UI_GROUPS.map((g, i) => (
            <button
              key={g.key}
              onClick={() => onToggle(i)}
              className={`flex min-h-[28px] w-full items-center gap-2 rounded-md px-2 py-0.5 text-left transition-opacity hover:bg-white/[0.05] ${
                visible[i] ? '' : 'opacity-35'
              }`}
            >
              <span
                className="h-[6px] w-[6px] shrink-0 rounded-full"
                style={{ background: g.color, boxShadow: `0 0 5px ${g.color}66` }}
              />
              <span className="flex-1 truncate text-xs text-slate-300">{g.label}</span>
              <span className="font-mono text-[10px] tabular-nums text-slate-500">
                {(counts[i] ?? 0).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
