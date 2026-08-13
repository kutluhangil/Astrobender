import { UI_GROUPS } from '@/lib/satellites'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface LayerPanelProps {
  counts: number[]
  visible: boolean[]
  onToggle: (index: number) => void
  onToggleScaleSandbox?: () => void
  onToggleAudio?: () => void
  audioPlaying?: boolean
  onTogglePlanetaryOrbits?: () => void
  planetaryOrbitsVisible?: boolean
  onToggleProbes?: () => void
  probesVisible?: boolean
  onToggleConstellations?: () => void
  constellationsVisible?: boolean
  onToggleAsteroids?: () => void
  asteroidsVisible?: boolean
  onToggleEarthObservatory?: () => void
  earthObservatoryVisible?: boolean
  onToggleSmallBodies?: () => void
  smallBodiesVisible?: boolean
  onToggleSkywatch?: () => void
  skywatchVisible?: boolean
  language?: UiLanguage
}

export default function LayerPanel({
  counts,
  visible,
  onToggle,
  onToggleScaleSandbox,
  onToggleAudio,
  audioPlaying = false,
  onTogglePlanetaryOrbits,
  planetaryOrbitsVisible = false,
  onToggleAsteroids,
  asteroidsVisible = false,
  onToggleEarthObservatory,
  earthObservatoryVisible = false,
  onToggleSmallBodies,
  smallBodiesVisible = false,
  onToggleSkywatch,
  skywatchVisible = false,
  language = 'tr',
}: LayerPanelProps) {
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)

  return (
    <div data-hud-surface className="pointer-events-auto w-full md:w-[248px] rounded-xl border border-white/10 bg-[#0a0e14]/80 px-4 py-3.5 backdrop-blur-xl space-y-3">
      {/* Top Utility Controls */}
      <div className="flex gap-1">
        <button
          onClick={onToggleScaleSandbox}
          className="flex-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 py-1 font-mono text-[9.5px] font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-all"
        >
          ⚖️ {t('Ölçek Laboratuvarı', 'Scale Sandbox')}
        </button>
        <button
          onClick={onToggleAudio}
          className={`px-2.5 rounded-md border py-1 font-mono text-[10px] transition-all ${
            audioPlaying
              ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
              : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          {audioPlaying ? `🔊 ${t('Ortam Açık', 'Ambient On')}` : `🔇 ${t('Sessiz', 'Mute')}`}
        </button>
      </div>

      {/* Cosmic Layers Toggles */}
      <div className="border-t border-white/5 pt-2">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
          {t('Kozmik Katmanlar', 'Cosmic Environments')}
        </div>
        <div className="grid grid-cols-2 gap-1 font-mono text-[9px] mt-1.5">
          <button
            onClick={onTogglePlanetaryOrbits}
            className={`py-1 rounded border transition-all ${
              planetaryOrbitsVisible ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-200 font-semibold shadow-[0_0_8px_rgba(6,182,212,0.3)]' : 'border-white/5 bg-white/5 text-white/60'
            }`}
          >
            🪐 {t('Yörüngeler', 'Orbits')}
          </button>
          <button
            onClick={onToggleEarthObservatory}
            className={`py-1 rounded border transition-all ${
              earthObservatoryVisible ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200 font-semibold shadow-[0_0_8px_rgba(52,211,153,0.25)]' : 'border-white/5 bg-white/5 text-white/60'
            }`}
          >
            🌍 {t('Dünya Verisi', 'Earth Data')}
          </button>
          <button
            onClick={onToggleSmallBodies}
            className={`py-1 rounded border transition-all ${
              smallBodiesVisible ? 'border-amber-400/50 bg-amber-400/15 text-amber-200 font-semibold shadow-[0_0_8px_rgba(251,191,36,0.25)]' : 'border-white/5 bg-white/5 text-white/60'
            }`}
          >
            ☄️ {t('JPL Cisimleri', 'JPL Objects')}
          </button>
          <button
            onClick={onToggleSkywatch}
            className={`py-1 rounded border transition-all ${
              skywatchVisible ? 'border-cyan-300/50 bg-cyan-300/15 text-cyan-100 font-semibold shadow-[0_0_8px_rgba(103,232,249,0.22)]' : 'border-white/5 bg-white/5 text-white/60'
            }`}
          >
            🌠 {t('Gökyüzü Takvimi', 'Skywatch')}
          </button>
        </div>
      </div>

      <div className="border-t border-white/5 pt-2">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
          {t('Görsel Yardımcılar', 'Visual Aids')}
        </div>
        <button
          onClick={onToggleAsteroids}
          aria-pressed={asteroidsVisible}
          className={`mt-1.5 w-full rounded border py-1 font-mono text-[9px] transition-all ${
            asteroidsVisible ? 'border-amber-500/50 bg-amber-500/20 text-amber-200 font-semibold shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 'border-white/5 bg-white/5 text-white/60'
          }`}
        >
          ☄️ {t('Şematik Asteroit ve Kuiper Kuşakları', 'Schematic Belts')}
        </button>
        <p className="mt-1 font-mono text-[7px] leading-relaxed text-slate-600">
          {t('Varsayılan kapalı · katalog ölçümü değildir.', 'Off by default · not a catalog measurement.')}
        </p>
      </div>

      {/* Satellite Layers */}
      <div>
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
          {t('Dünya Uyduları', 'Earth Satellites')}
        </div>
        <div className="space-y-0.5 max-h-[20vh] md:max-h-[140px] overflow-y-auto pr-1">
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
