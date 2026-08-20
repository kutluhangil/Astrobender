import { COMETS } from '@/lib/comets'
import { MPC_TROJAN_URL, NASA_LAGRANGE_URL } from '@/lib/lagrange'
import { UI_GROUPS } from '@/lib/satellites'
import {
  BRIGHT_STAR_CATALOG_SOURCE_URL,
  CONSTELLATION_FIGURE_STAR_COUNT,
  CONSTELLATIONS,
  IAU_CONSTELLATIONS,
  IAU_CONSTELLATIONS_SOURCE_URL,
} from '@/lib/constellations'
import { BRIGHT_STAR_COUNT, BRIGHT_STAR_MAGNITUDE_LIMIT } from '@/lib/star-catalog'
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
  onToggleComets?: () => void
  cometsVisible?: boolean
  onToggleLagrange?: () => void
  lagrangeVisible?: boolean
  onToggleMissionTimeline?: () => void
  missionTimelineVisible?: boolean
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
  onToggleProbes,
  probesVisible = false,
  onToggleConstellations,
  constellationsVisible = false,
  onToggleAsteroids,
  asteroidsVisible = false,
  onToggleComets,
  cometsVisible = false,
  onToggleLagrange,
  lagrangeVisible = false,
  onToggleMissionTimeline,
  missionTimelineVisible = false,
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
            onClick={onToggleProbes}
            className={`py-1 rounded border transition-all ${
              probesVisible ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-200 font-semibold shadow-[0_0_8px_rgba(6,182,212,0.3)]' : 'border-white/5 bg-white/5 text-white/60'
            }`}
          >
            🛰️ {t('Sondalar', 'Probes')}
          </button>
          <button
            onClick={onToggleConstellations}
            className={`py-1 rounded border transition-all ${
              constellationsVisible ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-200 font-semibold shadow-[0_0_8px_rgba(99,102,241,0.3)]' : 'border-white/5 bg-white/5 text-white/60'
            }`}
          >
            ✨ {t(`Takımyıldızlar ${IAU_CONSTELLATIONS.length}`, `Constellations ${IAU_CONSTELLATIONS.length}`)}
          </button>
          <button
            onClick={onToggleAsteroids}
            className={`py-1 rounded border transition-all ${
              asteroidsVisible ? 'border-amber-500/50 bg-amber-500/20 text-amber-200 font-semibold shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 'border-white/5 bg-white/5 text-white/60'
            }`}
          >
            ☄️ {t('Şematik Kuşaklar', 'Schematic Belts')}
          </button>
          <button
            onClick={onToggleComets}
            className={`py-1 rounded border transition-all ${
              cometsVisible ? 'border-sky-400/50 bg-sky-400/15 text-sky-100 font-semibold shadow-[0_0_8px_rgba(56,189,248,0.25)]' : 'border-white/5 bg-white/5 text-white/60'
            }`}
          >
            🌠 {t(`Kuyruklu Yıldızlar ${COMETS.length}`, `Comets ${COMETS.length}`)}
          </button>
          <button
            onClick={onToggleLagrange}
            className={`py-1 rounded border transition-all ${
              lagrangeVisible ? 'border-violet-400/50 bg-violet-400/15 text-violet-100 font-semibold shadow-[0_0_8px_rgba(167,139,250,0.25)]' : 'border-white/5 bg-white/5 text-white/60'
            }`}
          >
            🔺 {t('Lagrange & Trojanlar', 'Lagrange & Trojans')}
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
            onClick={onToggleMissionTimeline}
            className={`py-1 rounded border transition-all ${
              missionTimelineVisible ? 'border-emerald-300/50 bg-emerald-300/15 text-emerald-100 font-semibold shadow-[0_0_8px_rgba(110,231,183,0.22)]' : 'border-white/5 bg-white/5 text-white/60'
            }`}
          >
            🕰️ {t('Görev Zaman Tüneli', 'Mission Timeline')}
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
        {lagrangeVisible && (
          <div className="mt-1.5 rounded-md border border-violet-400/20 bg-violet-400/5 px-2 py-1.5 font-mono text-[8px] leading-relaxed text-violet-200/85">
            <p>
              {t(
                'L4 ve L5 gerçek 60° konumlarında. L1 ve L2 sıkıştırılmış ölçekte Dünya küresinin içinde kalacağı için abartılmış bir uzaklıkta çiziliyor.',
                'L4 and L5 sit at their true 60° positions. L1 and L2 would fall inside the Earth sphere at the compressed scale, so they are drawn at an exaggerated distance.',
              )}
            </p>
            <p className="mt-1">
              {t(
                'Jüpiter Trojan kampları şematiktir: kampın librasyon ve eğiklik yayılımını gösterir, kataloglanmış cisim konumlarını değil.',
                'The Jupiter Trojan camps are schematic: they show a camp’s libration and inclination spread, not catalogued object positions.',
              )}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-3">
              <a href={NASA_LAGRANGE_URL} target="_blank" rel="noreferrer" className="text-violet-200 hover:text-violet-100">
                {t('NASA Lagrange', 'NASA Lagrange')} ↗
              </a>
              <a href={MPC_TROJAN_URL} target="_blank" rel="noreferrer" className="text-violet-200 hover:text-violet-100">
                {t('MPC Trojan listesi', 'MPC Trojan list')} ↗
              </a>
            </div>
          </div>
        )}
        {cometsVisible && (
          <p className="mt-1.5 rounded-md border border-sky-400/20 bg-sky-400/5 px-2 py-1.5 font-mono text-[8px] leading-relaxed text-sky-200/80">
            {t(
              'Yörünge şekli JPL SBDB elemanlarından; kuyruklu yıldız çekirdekleri ölçeğe göre çizilemeyecek kadar küçük olduğu için sabit boyutlu işaretle gösteriliyor.',
              'Orbit shapes come from JPL SBDB elements; comet nuclei are far too small to draw to scale, so each is shown with a fixed-size marker.',
            )}
          </p>
        )}
        {constellationsVisible && (
          <div className="mt-1.5 space-y-1">
            <a
              href={IAU_CONSTELLATIONS_SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              className="block rounded-md border border-indigo-400/20 bg-indigo-400/5 px-2 py-1.5 font-mono text-[8px] leading-relaxed text-indigo-200/80 hover:bg-indigo-400/10"
            >
              {t(
                `IAU kataloğu: ${CONSTELLATIONS.length}/88 çizgi şekli, ${CONSTELLATION_FIGURE_STAR_COUNT} katalog yıldızı üzerinde. IAU resmî çizgi şekli tanımlamaz.`,
                `IAU catalog: ${CONSTELLATIONS.length}/88 line figures, drawn on ${CONSTELLATION_FIGURE_STAR_COUNT} catalogued stars. The IAU defines no official stick figures.`,
              )} ↗
            </a>
            <a
              href={BRIGHT_STAR_CATALOG_SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              className="block rounded-md border border-indigo-400/20 bg-indigo-400/5 px-2 py-1.5 font-mono text-[8px] leading-relaxed text-indigo-200/80 hover:bg-indigo-400/10"
            >
              {t(
                `Gökyüzü ${BRIGHT_STAR_COUNT.toLocaleString('tr-TR')} gerçek yıldızla çizilir; ${BRIGHT_STAR_MAGNITUDE_LIMIT} kadire kadar, renk B-V indisinden.`,
                `The sky is drawn from ${BRIGHT_STAR_COUNT.toLocaleString('en-US')} real stars down to magnitude ${BRIGHT_STAR_MAGNITUDE_LIMIT}, coloured by B-V index.`,
              )} ↗
            </a>
          </div>
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
