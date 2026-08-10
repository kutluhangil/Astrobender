import { UI_GROUPS } from '@/lib/satellites'
import { PLANETS, type CelestialBodyId, findPlanetDef } from '@/lib/planets'
import {
  IAU_CONSTELLATIONS,
  IAU_CONSTELLATIONS_SOURCE_URL,
} from '@/lib/constellations'
import { CELESTIAL_FACTS } from '@/lib/celestial-facts'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'
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

const PRIMARY_BODIES: { id: CelestialBodyId; name: string; nameTr: string; emoji: string; activeClass: string }[] = [
  { id: 'earth', name: 'Earth', nameTr: 'Dünya', emoji: '🌍', activeClass: 'border-cyan-500/60 bg-cyan-500/20 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]' },
  { id: 'moon', name: 'Moon', nameTr: 'Ay', emoji: '🌕', activeClass: 'border-amber-500/60 bg-amber-500/20 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.3)]' },
  { id: 'sun', name: 'Sun', nameTr: 'Güneş', emoji: '☀️', activeClass: 'border-orange-500/60 bg-orange-500/20 text-orange-200 shadow-[0_0_10px_rgba(249,115,22,0.3)]' },
]

function formatSemiMajorAxisAu(planet: (typeof PLANETS)[number]): string {
  if (planet.semiMajorAxisAu === undefined) {
    throw new Error(`Missing semi-major axis for planet: ${planet.id}`)
  }
  return `${planet.semiMajorAxisAu.toFixed(planet.semiMajorAxisAu < 1 ? 2 : 1)} AU`
}

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
  const [showAllPlanets, setShowAllPlanets] = useState(true)
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)

  const currentDef = findPlanetDef(focusBody)
  const currentLabel = focusBody === 'earth' ? '🌍 Earth' : focusBody === 'moon' ? '🌕 Moon' : focusBody === 'sun' ? '☀️ Sun' : currentDef ? `${currentDef.emoji} ${currentDef.name}` : focusBody

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

      {/* Target Body Header */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
            {t('Hedef Gök Cismi (3B Küre)', 'Target Body (3D Globe)')}
          </div>
          <button
            onClick={() => setShowAllPlanets(!showAllPlanets)}
            className="font-mono text-[9px] text-cyan-400 hover:text-cyan-300 underline"
          >
            {showAllPlanets ? t('Daralt', 'Compact') : t('Güneş Sistemi 🪐', 'Solar System 🪐')}
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
              {b.emoji} {language === 'tr' ? b.nameTr : b.name}
            </button>
          ))}
        </div>

        {/* Expanded Solar System Grid */}
        {showAllPlanets && (
          <>
            <div className="mb-1.5 font-mono text-[8.5px] uppercase tracking-[0.14em] text-cyan-300/65">
              {t('Astronomik yörüngeler · sıkıştırılmış görsel mesafe', 'Astronomical orbits · compressed visual distance')}
            </div>
            <div className="max-h-[30vh] md:max-h-[160px] overflow-y-auto space-y-1 pr-1 text-[11px] scrollbar-thin scrollbar-thumb-white/10">
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
                  <span>{p.emoji} {language === 'tr' ? CELESTIAL_FACTS[p.id].nameTr : p.name}</span>
                  <span
                    className="font-mono text-[9px] text-slate-500"
                    title={t(
                      'Gerçek yarı-büyük eksen; 3D görünüm sıkıştırılmıştır',
                      'Real semi-major axis; the 3D view is compressed',
                    )}
                  >
                    {formatSemiMajorAxisAu(p)}
                  </span>
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
                        {m.emoji} {language === 'tr' ? CELESTIAL_FACTS[m.id].nameTr : m.name}
                      </button>
                    ))}
                  </div>
                )}
                </div>
              ))}
            </div>
          </>
        )}

        {!showAllPlanets && focusBody !== 'earth' && focusBody !== 'moon' && focusBody !== 'sun' && (
          <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 font-mono text-[11px] text-cyan-200 flex items-center justify-between">
            <span>{t('Etkin Hedef:', 'Active Target:')}</span>
            <span className="font-semibold">{currentLabel}</span>
          </div>
        )}
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
              planetaryOrbitsVisible ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-200 font-semibold shadow-[0_0_8px_rgba(6,182,212,0.3)]' : 'border-white/5 bg-white/5 text-slate-500'
            }`}
          >
            🪐 {t('Yörüngeler', 'Orbits')}
          </button>
          <button
            onClick={onToggleProbes}
            className={`py-1 rounded border transition-all ${
              probesVisible ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-200 font-semibold shadow-[0_0_8px_rgba(6,182,212,0.3)]' : 'border-white/5 bg-white/5 text-slate-500'
            }`}
          >
            🛰️ {t('Sondalar', 'Probes')}
          </button>
          <button
            onClick={onToggleConstellations}
            className={`py-1 rounded border transition-all ${
              constellationsVisible ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-200 font-semibold shadow-[0_0_8px_rgba(99,102,241,0.3)]' : 'border-white/5 bg-white/5 text-slate-500'
            }`}
          >
            ✨ {t(`Takımyıldızlar ${IAU_CONSTELLATIONS.length}`, `Constellations ${IAU_CONSTELLATIONS.length}`)}
          </button>
          <button
            onClick={onToggleAsteroids}
            className={`py-1 rounded border transition-all ${
              asteroidsVisible ? 'border-amber-500/50 bg-amber-500/20 text-amber-200 font-semibold shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 'border-white/5 bg-white/5 text-slate-500'
            }`}
          >
            ☄️ {t('Şematik Kuşaklar', 'Schematic Belts')}
          </button>
          <button
            onClick={onToggleEarthObservatory}
            className={`py-1 rounded border transition-all ${
              earthObservatoryVisible ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200 font-semibold shadow-[0_0_8px_rgba(52,211,153,0.25)]' : 'border-white/5 bg-white/5 text-slate-500'
            }`}
          >
            🌍 {t('Dünya Verisi', 'Earth Data')}
          </button>
          <button
            onClick={onToggleSmallBodies}
            className={`py-1 rounded border transition-all ${
              smallBodiesVisible ? 'border-amber-400/50 bg-amber-400/15 text-amber-200 font-semibold shadow-[0_0_8px_rgba(251,191,36,0.25)]' : 'border-white/5 bg-white/5 text-slate-500'
            }`}
          >
            ☄️ {t('JPL Cisimleri', 'JPL Objects')}
          </button>
          <button
            onClick={onToggleSkywatch}
            className={`py-1 rounded border transition-all ${
              skywatchVisible ? 'border-cyan-300/50 bg-cyan-300/15 text-cyan-100 font-semibold shadow-[0_0_8px_rgba(103,232,249,0.22)]' : 'border-white/5 bg-white/5 text-slate-500'
            }`}
          >
            🌠 {t('Gökyüzü Takvimi', 'Skywatch')}
          </button>
        </div>
        {constellationsVisible && (
          <a
            href={IAU_CONSTELLATIONS_SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 block rounded-md border border-indigo-400/20 bg-indigo-400/5 px-2 py-1.5 font-mono text-[8px] leading-relaxed text-indigo-200/80 hover:bg-indigo-400/10"
          >
            {t(
              'IAU kataloğu: 88/88 · 5 temsili çizgi görünümü. IAU resmî çizgi şekli tanımlamaz.',
              'IAU catalog: 88/88 · 5 representative line figures. The IAU defines no official stick figures.',
            )} ↗
          </a>
        )}
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
