import { useCallback, useEffect, useRef, useState } from 'react'
import * as satellite from 'satellite.js'
import { GlobeEngine } from '@/lib/globe-engine'
import { UI_GROUPS } from '@/lib/satellites'
import type { SatInfo } from '@/lib/satellites'
import type { CelestialBodyId } from '@/lib/planets'
import { useSimClock } from '@/hooks/useSimClock'
import { useTleData } from '@/hooks/useTleData'
import { usePropagator } from '@/hooks/usePropagator'
import IdentityBlock from '@/components/hud/IdentityBlock'
import ClockCard from '@/components/hud/ClockCard'
import TimeController from '@/components/hud/TimeController'
import LayerPanel from '@/components/hud/LayerPanel'
import SearchBox from '@/components/hud/SearchBox'
import DetailPanel from '@/components/hud/DetailPanel'
import type { Telemetry } from '@/components/hud/DetailPanel'
import PlanetInfoCard from '@/components/hud/PlanetInfoCard'
import CinematicTitleOverlay from '@/components/hud/CinematicTitleOverlay'
import CosmicTourControls from '@/components/hud/CosmicTourControls'
import ScaleSandboxModal from '@/components/hud/ScaleSandboxModal'
import LandingSiteModal from '@/components/hud/LandingSiteModal'
import type { LandingSite } from '@/lib/landing-sites'
import { SpaceAudioSynth } from '@/lib/audio-synth'
import FallbackTable from '@/components/FallbackTable'

const EARTH_R = 6371
const EMPTY_SATS: SatInfo[] = []
const DEEP_LINK_SPEEDS = [-240, -60, -10, 1, 10, 60, 240]

interface HoverState {
  index: number
  x: number
  y: number
}

function detectWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function setUrlSat(norad: number | null) {
  const url = new URL(window.location.href)
  if (norad === null) url.searchParams.delete('sat')
  else url.searchParams.set('sat', String(norad))
  window.history.replaceState(null, '', url)
}

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<GlobeEngine | null>(null)
  const clock = useSimClock()
  const { status, dataset, error, warning: tleWarning, retry: retryTle } = useTleData()

  const [webglOk] = useState(detectWebGL)
  const [ctxLost, setCtxLost] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [selectedNorad, setSelectedNorad] = useState<number | null>(null)
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null)
  const [hover, setHover] = useState<HoverState | null>(null)
  const [groupVisible, setGroupVisible] = useState<boolean[]>(() =>
    UI_GROUPS.map(() => true),
  )
  const [showOrbit, setShowOrbit] = useState(true)
  const [showFoot, setShowFoot] = useState(true)
  const [follow, setFollow] = useState(false)
  const [focusBody, setFocusBody] = useState<CelestialBodyId>('earth')
  const [selectedPin, setSelectedPin] = useState<{ lat: number; lon: number; text: string; landingSite?: LandingSite | null } | null>(null)
  const [fps, setFps] = useState(0)

  // Panel visibility states
  const [layersOpen, setLayersOpen] = useState(false)
  const [mobilePlanetInfoOpen, setMobilePlanetInfoOpen] = useState(false)
  const [showScaleModal, setShowScaleModal] = useState(false)
  const [tleWarningDismissed, setTleWarningDismissed] = useState(false)

  // Cosmic environment states
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [planetaryOrbitsVisible, setPlanetaryOrbitsVisible] = useState(false)
  const [probesVisible, setProbesVisible] = useState(false)
  const [constellationsVisible, setConstellationsVisible] = useState(false)
  const [asteroidsVisible, setAsteroidsVisible] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    setTleWarningDismissed(false)
  }, [tleWarning])

  const audioSynthRef = useRef(new SpaceAudioSynth())

  const satsRef = useRef<SatInfo[]>(EMPTY_SATS)
  const noradMapRef = useRef(new Map<number, number>())
  const recCache = useRef(new Map<number, satellite.SatRec>())
  const groupVisibleRef = useRef(groupVisible)
  groupVisibleRef.current = groupVisible
  const selectedNoradRef = useRef<number | null>(null)
  selectedNoradRef.current = selectedNorad
  const urlInitRef = useRef(false)

  const sats = dataset?.sats ?? EMPTY_SATS

  const getRec = useCallback((index: number): satellite.SatRec | null => {
    const cached = recCache.current.get(index)
    if (cached) return cached
    const s = satsRef.current[index]
    if (!s) return null
    try {
      const rec = satellite.twoline2satrec(s.l1, s.l2)
      recCache.current.set(index, rec)
      return rec
    } catch {
      return null
    }
  }, [])

  // ---- direct SGP4 providers for the selected satellite (exact sim time) ----
  const orbitProvider = useCallback(
    (index: number, simMs: number, past: Float32Array, future: Float32Array) => {
      const rec = getRec(index)
      if (!rec) return
      const periodMs = ((2 * Math.PI) / rec.no) * 60 * 1000
      const n = past.length / 3
      const fill = (out: Float32Array, startMs: number, endMs: number) => {
        let lx = 0
        let ly = 0
        let lz = 0
        for (let i = 0; i < n; i++) {
          const t = startMs + ((endMs - startMs) * i) / (n - 1)
          try {
            const pv = satellite.propagate(rec, new Date(t))
            const p = pv?.position
            if (p && isFinite(p.x)) {
              lx = p.x / EARTH_R
              ly = p.y / EARTH_R
              lz = p.z / EARTH_R
            }
          } catch {
            /* keep last */
          }
          out.set([lx, ly, lz], i * 3)
        }
      }
      fill(past, simMs - periodMs / 2, simMs)
      fill(future, simMs, simMs + periodMs / 2)
    },
    [getRec],
  )

  const footprintProvider = useCallback(
    (index: number, simMs: number) => {
      const rec = getRec(index)
      if (!rec) return null
      try {
        const pv = satellite.propagate(rec, new Date(simMs))
        const p = pv?.position
        if (!p || !isFinite(p.x)) return null
        const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
        if (r - EARTH_R < 50) return null
        return { x: p.x / r, y: p.y / r, z: p.z / r, ang: Math.acos(EARTH_R / r) }
      } catch {
        return null
      }
    },
    [getRec],
  )

  const handleSelectBody = useCallback((body: CelestialBodyId) => {
    setFocusBody(body)
    engineRef.current?.setFocusTarget(body)
    // Close mobile panels when selecting a body
    setLayersOpen(false)
    setMobilePlanetInfoOpen(false)
  }, [])

  const handleToggleAudio = useCallback(() => {
    const playing = audioSynthRef.current.toggle()
    setAudioPlaying(playing)
  }, [])

  const handleTogglePlanetaryOrbits = useCallback(() => {
    setPlanetaryOrbitsVisible((v) => {
      const next = !v
      engineRef.current?.setPlanetaryOrbitsVisible(next)
      return next
    })
  }, [])

  const handleToggleProbes = useCallback(() => {
    setProbesVisible((v) => {
      const next = !v
      engineRef.current?.setProbesVisible(next)
      return next
    })
  }, [])

  const handleToggleConstellations = useCallback(() => {
    setConstellationsVisible((v) => {
      const next = !v
      engineRef.current?.setConstellationsVisible(next)
      return next
    })
  }, [])

  const handleToggleAsteroids = useCallback(() => {
    setAsteroidsVisible((v) => {
      const next = !v
      engineRef.current?.setAsteroidsVisible(next)
      return next
    })
  }, [])

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      engineRef.current?.setTheme(next)
      return next
    })
  }, [])

  // ---- selection (NORAD-stable) ----
  const selectSat = useCallback((index: number | null) => {
    if (index === null) {
      setSelectedIndex(null)
      setSelectedNorad(null)
      engineRef.current?.setSelected(null)
      setUrlSat(null)
      return
    }
    const s = satsRef.current[index]
    if (!s) return
    if (!groupVisibleRef.current[s.group]) {
      // a hidden group's satellite becomes visible when chosen
      setGroupVisible((prev) => {
        const next = [...prev]
        next[s.group] = true
        return next
      })
      engineRef.current?.setGroupVisible(s.group, true)
    }
    setSelectedIndex(index)
    setSelectedNorad(s.norad)
    engineRef.current?.setSelected(index, UI_GROUPS[s.group]?.color)
    setUrlSat(s.norad)
    // Close mobile panel on satellite selection
    setLayersOpen(false)
  }, [])

  // ---- engine lifecycle (created once) ----
  useEffect(() => {
    if (!webglOk || !mountRef.current) return
    const engine = new GlobeEngine(mountRef.current, {
      getSimTime: clock.getTime,
      onSelect: (idx) => selectSat(idx),
      onHover: (idx, x, y) => setHover(idx !== null ? { index: idx, x, y } : null),
      onContextLost: () => setCtxLost(true),
      onContextRestored: () => setCtxLost(false),
      onFps: (v) => setFps(v),
      onPinSelected: (pin) => setSelectedPin(pin),
      onSelectBody: (body) => {
        setFocusBody(body)
        engine.setFocusTarget(body)
        setLayersOpen(false)
        setMobilePlanetInfoOpen(false)
      },
      onTargetChanged: (body) => setFocusBody(body),
      orbitProvider,
      footprintProvider,
    })
    engineRef.current = engine
    return () => {
      engine.dispose()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webglOk])

  // ---- dataset -> engine (hot swap; preserves UI state) ----
  useEffect(() => {
    if (!dataset) return
    satsRef.current = dataset.sats
    recCache.current.clear()
    const map = new Map<number, number>()
    dataset.sats.forEach((s, i) => map.set(s.norad, i))
    noradMapRef.current = map

    engineRef.current?.buildSatellites(
      UI_GROUPS.map((g, i) => ({
        color: g.color,
        size: g.size,
        count: dataset.counts[i],
      })),
    )
    groupVisibleRef.current.forEach((v, i) =>
      engineRef.current?.setGroupVisible(i, v),
    )

    // re-resolve selection by NORAD identity
    const norad = selectedNoradRef.current
    if (norad !== null) {
      const idx = map.get(norad)
      if (idx === undefined) {
        setSelectedIndex(null)
        setSelectedNorad(null)
        engineRef.current?.setSelected(null)
        setUrlSat(null)
      } else {
        setSelectedIndex(idx)
        engineRef.current?.setSelected(idx, UI_GROUPS[dataset.sats[idx].group]?.color)
      }
    }

    // initial deep link ?sat=25544&speed=60
    if (!urlInitRef.current) {
      urlInitRef.current = true
      const params = new URLSearchParams(window.location.search)
      const sp = parseInt(params.get('speed') ?? '', 10)
      if (DEEP_LINK_SPEEDS.includes(sp)) clock.setSpeed(sp)
      const p = params.get('sat')
      if (p) {
        const idx = map.get(parseInt(p, 10))
        if (idx !== undefined) selectSat(idx)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset])

  const { degraded } = usePropagator(dataset, engineRef, clock)

  // ---- telemetry for the selected satellite (direct SGP4 at exact sim time) ----
  useEffect(() => {
    if (selectedIndex === null) {
      setTelemetry(null)
      return
    }
    const update = () => {
      const rec = getRec(selectedIndex)
      if (!rec) return
      try {
        const simMs = clock.getTime()
        const pv = satellite.propagate(rec, new Date(simMs))
        const p = pv?.position
        const v = pv?.velocity
        if (!p || !v || !isFinite(p.x)) return
        const gmst = satellite.gstime(new Date(simMs))
        const geo = satellite.eciToGeodetic(p, gmst)
        setTelemetry({
          lat: satellite.degreesLat(geo.latitude),
          lon: satellite.degreesLong(geo.longitude),
          alt: geo.height,
          speed: Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
          period: (2 * Math.PI) / rec.no,
          incl: (rec.inclo * 180) / Math.PI,
        })
      } catch {
        /* decayed */
      }
    }
    update()
    const id = setInterval(update, 250)
    return () => clearInterval(id)
  }, [selectedIndex, getRec, clock])

  // ---- engine-side option sync ----
  useEffect(() => {
    engineRef.current?.setShowOrbit(showOrbit)
  }, [showOrbit])
  useEffect(() => {
    engineRef.current?.setShowFootprint(showFoot)
  }, [showFoot])
  useEffect(() => {
    engineRef.current?.setFollow(follow)
  }, [follow])

  // Escape clears the selection and closes mobile panels
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectSat(null)
        setLayersOpen(false)
        setMobilePlanetInfoOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectSat])

  // Close layers when tapping 3D canvas on mobile
  const handleCanvasClick = useCallback(() => {
    if (layersOpen) setLayersOpen(false)
  }, [layersOpen])

  const toggleGroup = (i: number) => {
    setGroupVisible((prev) => {
      const next = prev.map((v, j) => (j === i ? !v : v))
      engineRef.current?.setGroupVisible(i, next[i])
      return next
    })
  }

  const selSat =
    selectedIndex !== null && selectedIndex < sats.length ? sats[selectedIndex] : null

  // tooltip stays inside the viewport
  const tooltipPos = hover
    ? {
        left: Math.min(hover.x + 14, window.innerWidth - 190),
        top: Math.min(hover.y + 14, window.innerHeight - 44),
      }
    : null
  const hoverSat = hover ? satsRef.current[hover.index] : null

  const layerPanelProps = {
    counts: dataset?.counts ?? UI_GROUPS.map(() => 0),
    visible: groupVisible,
    onToggle: toggleGroup,
    focusBody,
    onSelectBody: handleSelectBody,
    onToggleScaleSandbox: () => { setShowScaleModal(true); setLayersOpen(false) },
    onToggleAudio: handleToggleAudio,
    audioPlaying,
    onTogglePlanetaryOrbits: handleTogglePlanetaryOrbits,
    planetaryOrbitsVisible,
    onToggleProbes: handleToggleProbes,
    probesVisible,
    onToggleConstellations: handleToggleConstellations,
    constellationsVisible,
    onToggleAsteroids: handleToggleAsteroids,
    asteroidsVisible,
  }

  if (!webglOk) {
    return (
      <div className="h-full w-full overflow-y-auto bg-[#04060a]">
        <FallbackTable dataset={dataset} />
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#04060a] font-sans text-slate-200">
      {/* 3D Canvas */}
      <div ref={mountRef} className="absolute inset-0" onClick={handleCanvasClick} />

      {/* ============ HOVER TOOLTIP ============ */}
      {hover && tooltipPos && hoverSat && (
        <div
          className="pointer-events-none fixed z-30 flex max-w-[180px] items-center gap-1.5 truncate rounded-md border border-white/10 bg-[#0b0f16]/90 px-2.5 py-1 backdrop-blur-sm"
          style={tooltipPos}
        >
          <span
            className="h-[6px] w-[6px] shrink-0 rounded-full"
            style={{ background: UI_GROUPS[hoverSat.group]?.color }}
          />
          <span className="truncate font-mono text-[11px] text-slate-200">
            {hoverSat.name}
          </span>
        </div>
      )}

      {/* ============ TOP BAR ============ */}
      {/* Top-left: Identity */}
      <div className="absolute left-3 top-3 z-20 md:left-7 md:top-6">
        <IdentityBlock total={dataset?.total ?? 0} />
      </div>

      {/* Top-center: Clock */}
      <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 md:top-6">
        <ClockCard clock={clock} />
      </div>

      {/* Top-right (desktop only): Search */}
      <div className="hidden md:block absolute right-7 top-6 z-20 w-[300px]">
        <SearchBox sats={sats} onSelect={selectSat} />
      </div>

      {/* Mobile top-right: Planet info icon + Theme toggle */}
      <div className="absolute right-3 top-3 z-20 flex items-center gap-2 md:hidden">
        {/* Planet emoji icon to open planet info card */}
        <button
          onClick={() => setMobilePlanetInfoOpen((v) => !v)}
          className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-xl text-lg transition-all ${
            mobilePlanetInfoOpen
              ? 'border-cyan-400/60 bg-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
              : 'border-white/10 bg-[#0a0e14]/70'
          }`}
          title="Gezegen Bilgisi"
          aria-label="Gezegen bilgisini aç veya kapat"
        >
          🪐
        </button>
        {/* Theme toggle icon */}
        <button
          onClick={handleToggleTheme}
          className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-xl text-base transition-all ${
            theme === 'light'
              ? 'border-amber-900/20 bg-[#f8f6f0]/95 text-amber-950 shadow-[0_0_15px_rgba(217,119,6,0.15)]'
              : 'border-cyan-500/30 bg-[#0a0e17]/85 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
          }`}
          title="Tema Değiştir"
          aria-label="Karanlık ve açık tema arasında geçiş yap"
        >
          {theme === 'light' ? '🦴' : '🌌'}
        </button>
      </div>

      {/* Mobile search bar: below top bar */}
      <div className="absolute left-3 right-3 top-[56px] z-20 md:hidden">
        <SearchBox sats={sats} onSelect={selectSat} />
      </div>

      {/* ============ SECOND ROW: Tour + Theme (desktop) ============ */}
      <div className="hidden md:flex absolute left-7 top-[76px] z-20 items-center gap-2">
        <CosmicTourControls
          onSelectBody={handleSelectBody}
          currentBodyId={focusBody}
          onStartTour={() => engineRef.current?.startCinematicTour()}
          onStopTour={() => engineRef.current?.stopCinematicTour()}
        />
        <button
          onClick={handleToggleTheme}
          className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-3.5 py-2 font-mono text-xs font-semibold backdrop-blur-xl transition-all shadow-md ${
            theme === 'light'
              ? 'border-amber-900/20 bg-[#f8f6f0]/95 text-amber-950 hover:bg-[#ffffff] shadow-[0_0_15px_rgba(217,119,6,0.15)]'
              : 'border-cyan-500/30 bg-[#0a0e17]/85 text-cyan-300 hover:text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
          }`}
          title="Karanlık Uzay / Kemik Beyazı Teması Değiştir"
        >
          {theme === 'light' ? '🦴 KEMİK BEYAZI UZAY' : '🌌 KARANLIK UZAY'}
        </button>
      </div>

      {/* Mobile: Tour button just below search */}
      <div className="absolute left-3 top-[108px] z-20 md:hidden">
        <CosmicTourControls
          onSelectBody={handleSelectBody}
          currentBodyId={focusBody}
          onStartTour={() => engineRef.current?.startCinematicTour()}
          onStopTour={() => engineRef.current?.stopCinematicTour()}
        />
      </div>

      {/* ============ TARGET COORDINATES PIN BADGE ============ */}
      {selectedPin && (
        <div className="absolute left-3 right-3 top-[155px] z-30 flex items-center gap-3 rounded-xl border border-sky-400/40 bg-[#0a0e14]/85 px-4 py-2.5 backdrop-blur-xl shadow-[0_0_15px_rgba(56,189,248,0.25)] md:left-auto md:right-7 md:top-20 md:w-auto">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-sky-500" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-wider text-sky-400">Target Coordinates</div>
            <div className="font-mono text-xs font-semibold text-slate-100 truncate">{selectedPin.text}</div>
          </div>
          <button
            onClick={() => setSelectedPin(null)}
            className="ml-2 shrink-0 rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Seçili koordinatı kapat"
          >
            ✕
          </button>
        </div>
      )}

      {/* ============ DESKTOP LEFT PANEL: Layer Panel ============ */}
      <div className="absolute bottom-7 left-7 z-20 max-md:hidden">
        <LayerPanel {...layerPanelProps} />
      </div>

      {/* ============ MOBILE: FAB + Bottom Sheet ============ */}
      {/* Floating Action Button — bottom-right */}
      <button
        onClick={() => setLayersOpen((v) => !v)}
        className={`pointer-events-auto absolute bottom-[100px] right-3 z-30 h-12 w-12 rounded-full border backdrop-blur-xl shadow-lg transition-all md:hidden flex items-center justify-center text-xl ${
          layersOpen
            ? 'border-cyan-400/60 bg-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.5)] rotate-45'
            : 'border-white/20 bg-[#0a0e14]/80 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
        }`}
        aria-label={layersOpen ? 'Close layers panel' : 'Open layers panel'}
      >
        {layersOpen ? '✕' : '🌌'}
      </button>

      {/* Bottom Sheet Backdrop */}
      {layersOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setLayersOpen(false)}
        />
      )}

      {/* Bottom Sheet Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-30 md:hidden transition-transform duration-300 ease-out ${
          layersOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1 bg-[#0a0e14]/95 rounded-t-2xl border-t border-x border-white/10">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="bg-[#0a0e14]/95 border-x border-b border-white/10 max-h-[80vh] overflow-y-auto">
          <div className="px-3 pb-4 pt-1">
            <LayerPanel {...layerPanelProps} />
          </div>
        </div>
      </div>

      {/* ============ TIME CONTROLLER (bottom-center) ============ */}
      <div
        className="absolute bottom-4 left-1/2 z-20 max-w-[calc(100vw-24px)] -translate-x-1/2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <TimeController clock={clock} />
      </div>

      {/* ============ FOOTER CREDITS (desktop only) ============ */}
      <div className="pointer-events-none absolute bottom-1.5 left-7 z-10 hidden font-mono text-[10px] tracking-wider text-slate-600 md:block">
        TLE CelesTrak · SGP4 satellite.js · Imagery NASA · USGS Astrogeology · JPL
      </div>
      <div className="pointer-events-none absolute bottom-1.5 right-7 z-10 hidden font-mono text-[10px] tabular-nums tracking-wider text-slate-600 md:block">
        {fps} fps
      </div>

      {/* ============ SATELLITE DETAIL PANEL ============ */}
      {selSat && (
        <DetailPanel
          sat={selSat}
          telemetry={telemetry}
          showOrbit={showOrbit}
          showFoot={showFoot}
          follow={follow}
          onToggleOrbit={() => setShowOrbit((v) => !v)}
          onToggleFoot={() => setShowFoot((v) => !v)}
          onToggleFollow={() => setFollow((v) => !v)}
          onClose={() => selectSat(null)}
        />
      )}

      {/* ============ PLANET INFO CARD ============ */}
      {!selSat && (
        <>
          {/* Desktop only: top-right panel */}
          <div className="hidden md:block absolute top-4 right-4 z-20">
            <PlanetInfoCard bodyId={focusBody} />
          </div>
          {/* Mobile only: slide-up sheet controlled by 🪐 icon */}
          <div className="md:hidden">
            <PlanetInfoCard
              bodyId={focusBody}
              mobileExpanded={mobilePlanetInfoOpen}
              onMobileToggle={() => setMobilePlanetInfoOpen(false)}
            />
          </div>
        </>
      )}

      {/* ============ CINEMATIC OVERLAY ============ */}
      <CinematicTitleOverlay key={focusBody} bodyId={focusBody} />

      {/* ============ LANDING SITE MODAL ============ */}
      {selectedPin?.landingSite && (
        <LandingSiteModal site={selectedPin.landingSite} onClose={() => setSelectedPin(null)} />
      )}

      {/* ============ SCALE SANDBOX MODAL ============ */}
      {showScaleModal && (
        <ScaleSandboxModal onClose={() => setShowScaleModal(false)} />
      )}

      {/* ============ DEGRADED WARNING ============ */}
      {tleWarning && !tleWarningDismissed && (
        <div
          className="absolute bottom-[136px] right-3 z-20 w-[min(288px,calc(100vw-24px))] rounded-lg border border-amber-400/30 bg-[#17120a]/90 px-3 py-2 text-[11px] text-amber-100 shadow-lg backdrop-blur-xl md:right-7"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-amber-100">Canlı TLE güncellemesi kullanılamıyor</div>
              <div className="mt-0.5 text-amber-100/75">Paketlenmiş son geçerli veriyle devam ediliyor.</div>
            </div>
            <button
              type="button"
              onClick={() => setTleWarningDismissed(true)}
              className="-mr-1 -mt-1 rounded px-1.5 py-0.5 text-base leading-none text-amber-100/70 hover:bg-amber-300/10 hover:text-amber-100"
              aria-label="TLE durum uyarısını kapat"
            >
              ×
            </button>
          </div>
          <details className="mt-1.5 text-amber-100/70">
            <summary className="w-fit cursor-pointer text-[10px] text-amber-200/90">Teknik ayrıntı</summary>
            <p className="mt-1 break-words font-mono text-[9px] leading-relaxed">{tleWarning}</p>
          </details>
          <button
            type="button"
            onClick={() => {
              setTleWarningDismissed(false)
              void retryTle()
            }}
            className="mt-1.5 rounded border border-amber-300/30 px-2 py-0.5 font-mono text-[10px] text-amber-200 hover:bg-amber-300/10"
          >
            Tekrar dene
          </button>
        </div>
      )}
      {degraded && (
        <div className="absolute bottom-[100px] right-3 z-20 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-[11px] text-amber-200 max-w-[200px] md:right-7">
          Live propagation degraded: {degraded}
        </div>
      )}

      {/* ============ CONTEXT LOST ============ */}
      {ctxLost && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#04060a]/90">
          <div className="rounded-2xl border border-white/10 bg-[#0a0e14] px-6 py-5 text-center mx-4">
            <div className="text-sm text-slate-200">Graphics context lost</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg border border-sky-400/40 px-3 py-1 text-xs text-sky-200 hover:bg-sky-400/10"
            >
              Reload
            </button>
          </div>
        </div>
      )}

      {/* ============ LOADING SCREEN ============ */}
      {status === 'loading' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black px-4">
          <div className="font-mono text-xl font-bold tracking-[0.34em] text-white">
            <span className="text-cyan-400">A</span>STROBENDER
          </div>
          <div className="mt-6 h-7 w-7 animate-spin rounded-full border-2 border-cyan-400/25 border-t-cyan-400" />
          <div className="mt-4 font-mono text-xs text-slate-500 text-center">Initializing 3D Solar System & Orbitals…</div>
        </div>
      )}

      {/* ============ ERROR SCREEN ============ */}
      {status === 'error' && !dataset && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black px-4">
          <div className="font-mono text-xl font-bold tracking-[0.34em] text-white">
            <span className="text-cyan-400">A</span>STROBENDER
          </div>
          <div className="mt-6 max-w-sm text-center text-sm text-rose-300">
            Failed to load orbital data{error ? `: ${error}` : '.'}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg border border-rose-400/40 px-3 py-1 text-xs text-rose-200 hover:bg-rose-400/10"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
