import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as satellite from 'satellite.js'
import { GlobeEngine } from '@/lib/globe-engine'
import { formatUtc, tleAge, UI_GROUPS } from '@/lib/satellites'
import type { SatInfo } from '@/lib/satellites'
import { LANDING_SITES } from '@/lib/landing-sites'
import { missionEventTimeMs, type MissionEvent } from '@/lib/mission-timeline'
import type { CloseApproachHighlight } from '@/lib/jpl-small-bodies'
import type { CelestialBodyId } from '@/lib/planets'
import { useSimClock } from '@/hooks/useSimClock'
import { useTleData } from '@/hooks/useTleData'
import { usePropagator } from '@/hooks/usePropagator'
import { describeTleFreshness } from '@/lib/tle-freshness'
import { textureBytesToMib } from '@/lib/texture-lod'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import IdentityBlock from '@/components/hud/IdentityBlock'
import ClockCard from '@/components/hud/ClockCard'
import TimeController, {
  type SystemStatusMetric,
  type SystemStatusNotice,
} from '@/components/hud/TimeController'
import LayerPanel from '@/components/hud/LayerPanel'
import CelestialTray from '@/components/hud/CelestialTray'
import SearchBox from '@/components/hud/SearchBox'
import DetailPanel from '@/components/hud/DetailPanel'
import type { Telemetry } from '@/components/hud/DetailPanel'
import PlanetInfoCard from '@/components/hud/PlanetInfoCard'
import TargetBodyCallout from '@/components/hud/TargetBodyCallout'
import CosmicTourControls from '@/components/hud/CosmicTourControls'
import OpeningWordmark from '@/components/OpeningWordmark'
import ScaleSandboxModal from '@/components/hud/ScaleSandboxModal'
import LandingSiteModal from '@/components/hud/LandingSiteModal'
import MissionTimelinePanel from '@/components/hud/MissionTimelinePanel'
import EarthObservatoryPanel from '@/components/hud/EarthObservatoryPanel'
import SmallBodiesPanel from '@/components/hud/SmallBodiesPanel'
import SkywatchPanel from '@/components/hud/SkywatchPanel'
import MeteorFlowOverlay from '@/components/hud/MeteorFlowOverlay'
import OfflineBanner from '@/components/hud/OfflineBanner'
import PrepareOfflineControl from '@/components/hud/PrepareOfflineControl'
import AboutAstrobenderModal from '@/components/hud/AboutAstrobenderModal'
import { useBodyPanelPlacement } from '@/hooks/useBodyPanelPlacement'
import type { LandingSite } from '@/lib/landing-sites'
import type {
  EarthEvent,
  EarthLayerVisibility,
  EarthSourceId,
} from '@/lib/earth-observatory'
import { useEarthObservatory } from '@/hooks/useEarthObservatory'
import { useSmallBodies } from '@/hooks/useSmallBodies'
import { useSkywatchLocation } from '@/hooks/useSkywatchLocation'
import type { UnifiedSearchResult } from '@/lib/unified-search'
import { getSkyEvents, type SkyEvent } from '@/lib/sky-events'
import type { PerseidWatch } from '@/lib/perseid-watch'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'
import { SpaceAudioSynth } from '@/lib/audio-synth'
import {
  CINEMATIC_TOUR_AUDIO_PATHS,
  type CinematicTourLanguage,
} from '@/lib/cinematic-tour'
import FallbackTable from '@/components/FallbackTable'

const EARTH_R = 6371
const EMPTY_SATS: SatInfo[] = []
const DEEP_LINK_SPEEDS = [-240, -60, -10, 1, 10, 60, 240]

interface HoverState {
  index: number
  x: number
  y: number
}

interface CinematicAudioStatus {
  ready: boolean
  error: string | null
}

const INITIAL_CINEMATIC_AUDIO_STATUS: Record<CinematicTourLanguage, CinematicAudioStatus> = {
  tr: { ready: false, error: null },
  en: { ready: false, error: null },
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
  const isOnline = useOnlineStatus()

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
  const [bodySelectionRevision, setBodySelectionRevision] = useState(0)
  const [selectedPin, setSelectedPin] = useState<{ lat: number; lon: number; text: string; landingSite?: LandingSite | null } | null>(null)
  const [fps, setFps] = useState(0)

  // Panel visibility states
  const [layersOpen, setLayersOpen] = useState(false)
  const [mobilePlanetInfoOpen, setMobilePlanetInfoOpen] = useState(false)
  const [showScaleModal, setShowScaleModal] = useState(false)
  const [showAboutModal, setShowAboutModal] = useState(false)
  const [isCinematicTourActive, setIsCinematicTourActive] = useState(false)
  const [cinematicTourLanguage, setCinematicTourLanguage] = useState<CinematicTourLanguage>('tr')
  const [cinematicAudioStatus, setCinematicAudioStatus] = useState(INITIAL_CINEMATIC_AUDIO_STATUS)

  // Cosmic environment states
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [planetaryOrbitsVisible, setPlanetaryOrbitsVisible] = useState(false)
  const [probesVisible, setProbesVisible] = useState(false)
  const [constellationsVisible, setConstellationsVisible] = useState(false)
  const [cometsVisible, setCometsVisible] = useState(false)
  const [lagrangeVisible, setLagrangeVisible] = useState(false)
  const [missionTimelineOpen, setMissionTimelineOpen] = useState(false)
  const [asteroidsVisible, setAsteroidsVisible] = useState(false)
  const [earthObservatoryOpen, setEarthObservatoryOpen] = useState(false)
  const [earthLayerVisibility, setEarthLayerVisibility] = useState<EarthLayerVisibility>({
    eonet: true,
    usgs: true,
    aurora: true,
  })
  const [smallBodiesOpen, setSmallBodiesOpen] = useState(false)
  const [skywatchOpen, setSkywatchOpen] = useState(false)
  const [meteorFlowVisible, setMeteorFlowVisible] = useState(false)
  const [skywatchCalculatedAt, setSkywatchCalculatedAt] = useState(() => Date.now())
  // Reported in the status port so the close-range satellite reduction is
  // visible rather than a silent drop in the record count.
  const [satelliteThinning, setSatelliteThinning] = useState(1)
  const [residentTextureBytes, setResidentTextureBytes] = useState(0)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('tr')
  const [searchNotice, setSearchNotice] = useState<string | null>(null)
  const earthObservatory = useEarthObservatory(earthObservatoryOpen)
  const smallBodies = useSmallBodies(smallBodiesOpen)
  const skywatchLocation = useSkywatchLocation()
  const t = (tr: string, en: string) => pickLanguage(uiLanguage, tr, en)
  const skywatchEvents = useMemo(
    () => getSkyEvents({
      start: new Date(skywatchCalculatedAt),
      end: new Date(skywatchCalculatedAt + 90 * 24 * 60 * 60 * 1000),
      observer: skywatchLocation.observer ?? undefined,
      language: uiLanguage,
    }),
    [skywatchCalculatedAt, skywatchLocation.observer, uiLanguage],
  )

  useEffect(() => {
    document.documentElement.lang = uiLanguage
  }, [uiLanguage])

  useEffect(() => {
    const id = setInterval(() => {
      const engine = engineRef.current
      if (!engine) return
      setSatelliteThinning(engine.getSatelliteThinning())
      setResidentTextureBytes(engine.getResidentTextureBytes())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!skywatchOpen) return
    const refresh = () => setSkywatchCalculatedAt(Date.now())
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    const interval = window.setInterval(refresh, 60 * 60 * 1000)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [skywatchOpen])

  const audioSynthRef = useRef(new SpaceAudioSynth())
  const cinematicAudioRefs = useRef<Record<CinematicTourLanguage, HTMLAudioElement | null>>({
    tr: null,
    en: null,
  })

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
    setSelectedPin(null)
    setMeteorFlowVisible(false)
    setFocusBody(body)
    setBodySelectionRevision((current) => current + 1)
    engineRef.current?.setFocusTarget(body)
    // Close mobile panels when selecting a body
    setLayersOpen(false)
    setMobilePlanetInfoOpen(false)
  }, [])

  const handleToggleEarthObservatory = useCallback(() => {
    setEarthObservatoryOpen((current) => {
      const next = !current
      if (next) {
        handleSelectBody('earth')
        setLayersOpen(false)
        setSmallBodiesOpen(false)
      }
      return next
    })
  }, [handleSelectBody])

  const handleToggleSmallBodies = useCallback(() => {
    setSmallBodiesOpen((current) => {
      const next = !current
      if (next) {
        setEarthObservatoryOpen(false)
        setLayersOpen(false)
      }
      return next
    })
  }, [])

  const handleToggleSkywatch = useCallback(() => {
    setSkywatchOpen((current) => {
      const next = !current
      if (next) {
        setSkywatchCalculatedAt(Date.now())
        setEarthObservatoryOpen(false)
        setSmallBodiesOpen(false)
        setLayersOpen(false)
      }
      return next
    })
  }, [])

  const handleSelectEarthEvent = useCallback((event: EarthEvent) => {
    handleSelectBody('earth')
    engineRef.current?.showEarthCoordinate(event.lat, event.lon)
    const lat = `${Math.abs(event.lat).toFixed(2)}° ${event.lat >= 0 ? 'N' : 'S'}`
    const lon = `${Math.abs(event.lon).toFixed(2)}° ${event.lon >= 0 ? 'E' : 'W'}`
    setSelectedPin({
      lat: event.lat,
      lon: event.lon,
      text: `${event.title}: ${lat}, ${lon}`,
    })
  }, [handleSelectBody])

  const handleToggleEarthLayer = useCallback((source: EarthSourceId) => {
    setEarthLayerVisibility((current) => ({ ...current, [source]: !current[source] }))
  }, [])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (!earthObservatoryOpen) {
      engine.setEarthObservatoryEvents([])
      engine.setAuroraOverlay([])
      return
    }
    engine.setEarthObservatoryEvents(
      earthObservatory.events.filter((event) =>
        event.kind === 'earthquake'
          ? earthLayerVisibility.usgs
          : earthLayerVisibility.eonet,
      ),
    )
    engine.setAuroraOverlay(
      earthLayerVisibility.aurora ? (earthObservatory.aurora?.points ?? []) : [],
    )
  }, [
    earthLayerVisibility,
    earthObservatory.aurora,
    earthObservatory.events,
    earthObservatoryOpen,
  ])

  const handleToggleAudio = useCallback(() => {
    const playing = audioSynthRef.current.toggle()
    setAudioPlaying(playing)
  }, [])

  const stopCinematicTour = useCallback(() => {
    for (const audio of Object.values(cinematicAudioRefs.current)) {
      if (!audio) continue
      audio.pause()
      audio.currentTime = 0
    }
    engineRef.current?.stopCinematicTour()
    setIsCinematicTourActive(false)
  }, [])

  const startCinematicTour = useCallback(() => {
    const audio = cinematicAudioRefs.current[cinematicTourLanguage]
    const engine = engineRef.current
    if (!audio || !engine) {
      setCinematicAudioStatus((current) => ({
        ...current,
        [cinematicTourLanguage]: {
          ...current[cinematicTourLanguage],
          error: 'Sinematik tur başlatılamadı: ses veya 3D sahne hazır değil.',
        },
      }))
      return
    }
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      setCinematicAudioStatus((current) => ({
        ...current,
        [cinematicTourLanguage]: {
          ...current[cinematicTourLanguage],
          error: 'Sinematik sesin süresi okunamadı. Sayfayı yenileyip yeniden deneyin.',
        },
      }))
      return
    }

    audio.currentTime = 0
    void audio.play().then(
      () => {
        engine.startCinematicTour(audio.duration)
        setCinematicAudioStatus((current) => ({
          ...current,
          [cinematicTourLanguage]: { ...current[cinematicTourLanguage], error: null },
        }))
        setIsCinematicTourActive(true)
      },
      (error: unknown) => {
        engine.stopCinematicTour()
        setIsCinematicTourActive(false)
        setCinematicAudioStatus((current) => ({
          ...current,
          [cinematicTourLanguage]: {
            ...current[cinematicTourLanguage],
            error: `Sinematik ses başlatılamadı: ${error instanceof Error ? error.message : String(error)}`,
          },
        }))
      },
    )
  }, [cinematicTourLanguage])

  const handleTogglePlanetaryOrbits = useCallback(() => {
    setPlanetaryOrbitsVisible((v) => {
      const next = !v
      engineRef.current?.setPlanetaryOrbitsVisible(next)
      return next
    })
  }, [])

  const handleToggleComets = useCallback(() => {
    setCometsVisible((v) => {
      const next = !v
      engineRef.current?.setCometsVisible(next)
      return next
    })
  }, [])

  const handleToggleLagrange = useCallback(() => {
    setLagrangeVisible((v) => {
      const next = !v
      engineRef.current?.setLagrangeVisible(next)
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

  const handleSelectSkywatchEvent = useCallback((event: SkyEvent) => {
    const eventTime = Date.parse(event.startsAt)
    if (!Number.isFinite(eventTime)) {
      throw new Error(`Skywatch event has an invalid startsAt value: ${event.startsAt}`)
    }
    selectSat(null)
    clock.setTime(eventTime)
    handleSelectBody(event.targetBody)
    setMeteorFlowVisible(event.id === 'meteor-perseids-2026')
    setSkywatchOpen(false)
    setLayersOpen(false)
    setSearchNotice(
      uiLanguage === 'tr'
        ? `${event.title} simülasyonda açıldı.`
        : `${event.title} opened in the simulation.`,
    )
  }, [clock, handleSelectBody, selectSat, uiLanguage])

  const handleShowCloseApproach = useCallback((highlight: CloseApproachHighlight) => {
    selectSat(null)
    clock.setTime(highlight.timeMs)
    handleSelectBody(highlight.namedBody?.bodyId ?? 'earth')
    setSmallBodiesOpen(false)
    setLayersOpen(false)
    setSearchNotice(
      uiLanguage === 'tr'
        ? `${highlight.approach.fullName} yakın geçişi simülasyon saatine alındı (${highlight.approach.closeApproachDate} TDB).`
        : `${highlight.approach.fullName} close approach loaded into the simulation clock (${highlight.approach.closeApproachDate} TDB).`,
    )
  }, [clock, handleSelectBody, selectSat, uiLanguage])

  const handleSelectMissionEvent = useCallback((event: MissionEvent) => {
    selectSat(null)
    clock.setTime(missionEventTimeMs(event))
    handleSelectBody(event.targetBody)
    const site = event.landingSiteId
      ? LANDING_SITES.find((candidate) => candidate.id === event.landingSiteId)
      : undefined
    if (site) {
      window.requestAnimationFrame(() => {
        engineRef.current?.showBodyCoordinate(site.bodyId, site.lat, site.lon)
        setSelectedPin({
          lat: site.lat,
          lon: site.lon,
          text: uiLanguage === 'tr' ? site.nameTr : site.name,
          landingSite: site,
        })
      })
    }
    setLayersOpen(false)
    setSearchNotice(
      uiLanguage === 'tr'
        ? `${event.missionTr} · ${event.titleTr} simülasyon saatine alındı.`
        : `${event.missionEn} · ${event.titleEn} loaded into the simulation clock.`,
    )
  }, [clock, handleSelectBody, selectSat, uiLanguage])

  const handleToggleMissionTimeline = useCallback(() => {
    setMissionTimelineOpen((open) => {
      const next = !open
      if (next) {
        setSmallBodiesOpen(false)
        setEarthObservatoryOpen(false)
        setSkywatchOpen(false)
      }
      return next
    })
    setLayersOpen(false)
  }, [])

  const handleFocusSmallBody = useCallback((bodyId: CelestialBodyId) => {
    selectSat(null)
    handleSelectBody(bodyId)
    setSmallBodiesOpen(false)
    setLayersOpen(false)
  }, [handleSelectBody, selectSat])

  const handleStartPerseidSimulation = useCallback((watch: PerseidWatch) => {
    const peakTime = Date.parse(watch.peakAt)
    if (!Number.isFinite(peakTime)) {
      throw new Error(`Perseid peak time is invalid: ${watch.peakAt}`)
    }
    selectSat(null)
    clock.setTime(peakTime)
    handleSelectBody('earth')
    setMeteorFlowVisible(true)
    setSkywatchOpen(false)
    setLayersOpen(false)
    setSearchNotice(
      uiLanguage === 'tr'
        ? 'Perseid görsel akışı simülasyonda açıldı; akış gerçek zamanlı meteor sayısı değildir.'
        : 'Perseid visual stream opened in the simulation; it is not a real-time meteor count.',
    )
  }, [clock, handleSelectBody, selectSat, uiLanguage])

  const handleSearchResult = useCallback((result: UnifiedSearchResult) => {
    setSearchNotice(null)
    switch (result.kind) {
      case 'satellite':
        selectSat(result.satelliteIndex)
        return
      case 'body':
        selectSat(null)
        handleSelectBody(result.bodyId)
        return
      case 'surface-site': {
        selectSat(null)
        handleSelectBody(result.site.bodyId)
        window.requestAnimationFrame(() => {
          engineRef.current?.showBodyCoordinate(result.site.bodyId, result.site.lat, result.site.lon)
          setSelectedPin({
            lat: result.site.lat,
            lon: result.site.lon,
            text: uiLanguage === 'tr' ? result.site.nameTr : result.site.name,
            landingSite: result.site,
          })
        })
        return
      }
      case 'earth-event':
        selectSat(null)
        handleSelectEarthEvent(result.event)
        return
      case 'sky-event':
        handleSelectSkywatchEvent(result.event)
        return
      case 'small-body':
      case 'close-approach':
      case 'mission':
        setEarthObservatoryOpen(false)
        setSmallBodiesOpen(true)
        setLayersOpen(false)
        setSearchNotice(
          uiLanguage === 'tr'
            ? `${result.title} için JPL gözlemevi açıldı.`
            : `JPL observatory opened for ${result.title}.`,
        )
        return
      case 'constellation':
        setConstellationsVisible(true)
        engineRef.current?.setConstellationsVisible(true)
        setSearchNotice(
          result.constellation.renderedFigure
            ? `${result.title} · ${uiLanguage === 'tr' ? 'temsili yıldız çizgisi görünür' : 'representative star figure visible'}`
            : `${result.title} · ${uiLanguage === 'tr' ? 'IAU kataloğunda; resmî çizgi şekli yok' : 'IAU catalog; no official stick figure'}`,
        )
    }
  }, [handleSelectBody, handleSelectEarthEvent, handleSelectSkywatchEvent, selectSat, uiLanguage])

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
        setBodySelectionRevision((current) => current + 1)
        engine.setFocusTarget(body)
        setLayersOpen(false)
        setMobilePlanetInfoOpen(false)
      },
      onTargetChanged: (body) => setFocusBody(body),
      onTourEnded: () => setIsCinematicTourActive(false),
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

  useEffect(() => {
    const cleanups = (Object.entries(CINEMATIC_TOUR_AUDIO_PATHS) as Array<[CinematicTourLanguage, string]>).map(
      ([language, path]) => {
        const audio = new Audio(`${import.meta.env.BASE_URL}${path}`)
        audio.preload = 'metadata'
        const handleMetadata = () => {
          setCinematicAudioStatus((current) => ({
            ...current,
            [language]: Number.isFinite(audio.duration) && audio.duration > 0
              ? { ready: true, error: null }
              : { ready: false, error: 'Sinematik ses geçersiz bir süre bildirdi.' },
          }))
        }
        const handleError = () => {
          setCinematicAudioStatus((current) => ({
            ...current,
            [language]: { ready: false, error: `Sinematik ses yüklenemedi: ${audio.currentSrc || path}` },
          }))
        }
        const handleEnded = () => {
          engineRef.current?.stopCinematicTour()
          setIsCinematicTourActive(false)
        }

        audio.addEventListener('loadedmetadata', handleMetadata)
        audio.addEventListener('error', handleError)
        audio.addEventListener('ended', handleEnded)
        cinematicAudioRefs.current[language] = audio
        audio.load()

        return () => {
          audio.pause()
          audio.removeEventListener('loadedmetadata', handleMetadata)
          audio.removeEventListener('error', handleError)
          audio.removeEventListener('ended', handleEnded)
          if (cinematicAudioRefs.current[language] === audio) cinematicAudioRefs.current[language] = null
        }
      },
    )

    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [])

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

  const { degraded, diagnostics: propagatorDiagnostics } = usePropagator(dataset, engineRef, clock)

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

  // The desktop body panel follows the focused body instead of a fixed corner
  const planetInfoRef = useRef<HTMLDivElement>(null)
  // The body panel follows its body only while it owns the right-hand space;
  // an explicitly opened panel takes that space back.
  const planetInfoPlacement = useBodyPanelPlacement(
    focusBody,
    engineRef,
    planetInfoRef,
    !selSat && !skywatchOpen && !smallBodiesOpen && !earthObservatoryOpen && !missionTimelineOpen,
  )

  // tooltip stays inside the viewport
  const tooltipPos = hover
    ? {
        left: Math.min(hover.x + 14, window.innerWidth - 190),
        top: Math.min(hover.y + 14, window.innerHeight - 44),
      }
    : null
  const hoverSat = hover ? satsRef.current[hover.index] : null
  const tleFreshness = dataset ? describeTleFreshness(dataset, Date.now()) : null
  const systemMetrics: SystemStatusMetric[] = dataset && tleFreshness
    ? [
        ...(satelliteThinning < 0.995
          ? [{
              id: 'satellite-thinning',
              label: t('Yakın plan seyreltme', 'Close-range thinning'),
              value: t(
                `Kayıtların %${Math.round(satelliteThinning * 100)}'i çiziliyor`,
                `${Math.round(satelliteThinning * 100)}% of records drawn`,
              ),
              tone: 'warning' as const,
            }]
          : []),
        ...(residentTextureBytes > 0
          ? [{
              id: 'texture-memory',
              label: t('Doku belleği', 'Texture memory'),
              value: t(
                `${Math.round(textureBytesToMib(residentTextureBytes))} MiB yakın plan dokusu`,
                `${Math.round(textureBytesToMib(residentTextureBytes))} MiB of close-range textures`,
              ),
              tone: 'normal' as const,
            }]
          : []),
        {
          id: 'tle-epoch',
          label: t('TLE epoch yaşı', 'TLE epoch age'),
          value: `${tleAge(dataset.epochMs, Date.now())} · ${dataset.source}`,
          tone:
            tleFreshness.severity === 'stale'
              ? 'critical'
              : tleFreshness.severity === 'aging'
                ? 'warning'
                : 'normal',
        },
        {
          id: 'tle-fetched',
          label: t('Son alım', 'Last fetched'),
          value: formatUtc(dataset.fetchedAt),
        },
      ]
    : []
  const systemNotices: SystemStatusNotice[] = [
    ...(tleFreshness?.severity === 'stale'
      ? [{
          id: 'tle-freshness',
          title: t('Uydu yörünge verisi yaşlandı', 'Satellite orbital data is stale'),
          summary: t(
            `Orta TLE epoch’u ${tleAge(dataset?.epochMs ?? 0, Date.now())} yaşında; yeni kaynak verisi gelene kadar konum hassasiyeti azalabilir.`,
            `The median TLE epoch is ${tleAge(dataset?.epochMs ?? 0, Date.now())} old; position accuracy may degrade until newer source data arrives.`,
          ),
          technicalDetails: dataset
            ? `source=${dataset.source}; epoch=${formatUtc(dataset.epochMs)}; fetchedAt=${formatUtc(dataset.fetchedAt)}`
            : undefined,
          retryLabel: t('Tekrar dene', 'Retry'),
          onRetry: () => void retryTle(),
        }]
      : []),
    ...(tleWarning
      ? [{
          id: 'tle',
          title: t('Canlı TLE güncellemesi kullanılamıyor', 'Live TLE update unavailable'),
          summary: t(
            'Paketlenmiş son geçerli uydu kataloğu kullanılmaya devam ediyor.',
            'The last valid bundled satellite catalog remains in use.',
          ),
          technicalDetails: tleWarning,
          retryLabel: t('Tekrar dene', 'Retry'),
          onRetry: () => void retryTle(),
        }]
      : []),
    ...(propagatorDiagnostics.invalidRecords > 0 || propagatorDiagnostics.failedRecords > 0
      ? [{
          id: 'propagator-records',
          title: t('Bazı uydu kayıtları hesaplanamadı', 'Some satellite records could not be propagated'),
          summary: t(
            `${propagatorDiagnostics.invalidRecords + propagatorDiagnostics.failedRecords} kayıt son güvenilir konumuyla tutuluyor veya gizleniyor.`,
            `${propagatorDiagnostics.invalidRecords + propagatorDiagnostics.failedRecords} records are retained at their last reliable position or hidden.`,
          ),
          technicalDetails: `invalid=${propagatorDiagnostics.invalidRecords}; latestPropagationFailures=${propagatorDiagnostics.failedRecords}; total=${propagatorDiagnostics.totalRecords}`,
        }]
      : []),
    ...(degraded
      ? [{
          id: 'propagator',
          title: t('Canlı yörünge hesabı yavaşladı', 'Live propagation slowed down'),
          summary: t(
            'Uydu konumları korunuyor; yoğun hesaplama geçici olarak sınırlandı.',
            'Satellite positions are preserved; intensive calculation is temporarily limited.',
          ),
          technicalDetails: degraded,
        }]
      : []),
    ...(smallBodies.error
      ? [{
          id: 'small-bodies',
          title: t('JPL yakın geçiş verisi alınamadı', 'JPL close-approach data unavailable'),
          summary: t(
            'Küçük cisim paneli son kullanılabilir veriyi koruyor.',
            'The small-bodies panel retains the last available data.',
          ),
          technicalDetails: smallBodies.error,
          retryLabel: t('Tekrar dene', 'Retry'),
          onRetry: () => void smallBodies.refresh(),
        }]
      : []),
    ...Object.entries(earthObservatory.errors).map(([source, details]) => ({
      id: `earth-${source}`,
      title: t('Dünya Gözlemevi kaynağı güncellenemedi', 'Earth Observatory source unavailable'),
      summary: t(
        `${source.toUpperCase()} akışı güncellenemedi; kullanılabilir önbellek verisi korunuyor.`,
        `${source.toUpperCase()} could not be refreshed; available cached data is retained.`,
      ),
      technicalDetails: details,
      retryLabel: t('Tekrar dene', 'Retry'),
      onRetry: () => void earthObservatory.refresh(),
    })),
  ]

  const layerPanelProps = {
    counts: dataset?.counts ?? UI_GROUPS.map(() => 0),
    visible: groupVisible,
    onToggle: toggleGroup,
    onToggleScaleSandbox: () => { setShowScaleModal(true); setLayersOpen(false) },
    onToggleAudio: handleToggleAudio,
    audioPlaying,
    onTogglePlanetaryOrbits: handleTogglePlanetaryOrbits,
    planetaryOrbitsVisible,
    onToggleProbes: handleToggleProbes,
    probesVisible,
    onToggleComets: handleToggleComets,
    cometsVisible,
    onToggleLagrange: handleToggleLagrange,
    lagrangeVisible,
    onToggleMissionTimeline: handleToggleMissionTimeline,
    missionTimelineVisible: missionTimelineOpen,
    onToggleConstellations: handleToggleConstellations,
    constellationsVisible,
    onToggleAsteroids: handleToggleAsteroids,
    asteroidsVisible,
    onToggleEarthObservatory: handleToggleEarthObservatory,
    earthObservatoryVisible: earthObservatoryOpen,
    onToggleSmallBodies: handleToggleSmallBodies,
    smallBodiesVisible: smallBodiesOpen,
    onToggleSkywatch: handleToggleSkywatch,
    skywatchVisible: skywatchOpen,
  }

  if (!webglOk) {
    return (
      <div className="h-full w-full overflow-y-auto bg-[#04060a]">
        <FallbackTable dataset={dataset} />
      </div>
    )
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[#04060a] font-sans text-slate-200"
      data-space-theme={theme}
    >
      {/* 3D Canvas */}
      <div ref={mountRef} className="absolute inset-0" onClick={handleCanvasClick} />

      {status !== 'loading' && !(status === 'error' && !dataset) && <OpeningWordmark />}

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

      <OfflineBanner language={uiLanguage} />
      {!layersOpen && <PrepareOfflineControl language={uiLanguage} />}

      {/* ============ TOP BAR ============ */}
      {/* Top-left: Identity — shifted down while the offline banner occupies
          the top strip, so it never sits underneath it. */}
      <div
        className={`absolute left-3 z-20 md:left-7 transition-[top] duration-200 ${
          isOnline ? 'top-3 md:top-6' : 'top-10 md:top-14'
        }`}
      >
        <IdentityBlock total={dataset?.total ?? 0} />
      </div>

      {/* Top-center: Clock — same offline offset as Identity above. */}
      <div
        className={`absolute left-1/2 z-20 -translate-x-1/2 transition-[top] duration-200 ${
          isOnline ? 'top-3 md:top-6' : 'top-10 md:top-14'
        }`}
      >
        <ClockCard clock={clock} />
      </div>

      {/* Top-right (desktop only): Search */}
      <div className="hidden md:block absolute right-4 top-[338px] z-20 w-[310px]">
        <SearchBox
          sats={sats}
          earthEvents={earthObservatory.events}
          closeApproaches={smallBodies.approaches}
          skyEvents={skywatchEvents}
          language={uiLanguage}
          onSelectResult={handleSearchResult}
        />
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
          title={t('Gezegen Bilgisi', 'Body Information')}
          aria-label={t('Gezegen bilgisini aç veya kapat', 'Open or close body information')}
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
          title={t('Tema Değiştir', 'Change Theme')}
          aria-label={t('Karanlık ve açık tema arasında geçiş yap', 'Switch between dark and light themes')}
        >
          {theme === 'light' ? '☀️' : '🌌'}
        </button>
        <button
          type="button"
          onClick={() => setUiLanguage((language) => language === 'tr' ? 'en' : 'tr')}
          className="flex h-9 min-w-9 items-center justify-center rounded-full border border-white/10 bg-[#0a0e14]/70 px-2 font-mono text-[9px] text-cyan-200 backdrop-blur-xl"
          aria-label={uiLanguage === 'tr' ? 'Arayüzü İngilizce yap' : 'Switch interface to Turkish'}
        >
          {uiLanguage === 'tr' ? 'EN' : 'TR'}
        </button>
        <button
          type="button"
          onClick={() => setShowAboutModal(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#0a0e14]/70 font-mono text-xs font-bold text-cyan-200 backdrop-blur-xl"
          aria-label={t('Yöntem, veri ve gizlilik bilgisi', 'Method, data and privacy information')}
        >
          i
        </button>
      </div>

      {/* Mobile search bar: below top bar */}
      <div className="absolute left-3 right-3 top-[56px] z-20 md:hidden">
        <SearchBox
          sats={sats}
          earthEvents={earthObservatory.events}
          closeApproaches={smallBodies.approaches}
          skyEvents={skywatchEvents}
          language={uiLanguage}
          onSelectResult={handleSearchResult}
        />
      </div>

      {/* ============ SECOND ROW: Tour + Theme (desktop) ============ */}
      {/* z-25: the Layer Panel below (z-20) grows upward from bottom-7 and
          can reach this row's height, which would otherwise intercept
          clicks on the tour-start button. */}
      <div className="hidden md:flex absolute left-7 top-[76px] z-[25] items-center gap-2">
        <CosmicTourControls
          currentBodyId={focusBody}
          uiLanguage={uiLanguage}
          language={cinematicTourLanguage}
          isTourActive={isCinematicTourActive}
          isAudioReady={cinematicAudioStatus[cinematicTourLanguage].ready}
          audioError={cinematicAudioStatus[cinematicTourLanguage].error}
          onLanguageChange={setCinematicTourLanguage}
          onStartTour={startCinematicTour}
          onStopTour={stopCinematicTour}
        />
        <button
          onClick={handleToggleTheme}
          className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-3.5 py-2 font-mono text-xs font-semibold backdrop-blur-xl transition-all shadow-md ${
            theme === 'light'
              ? 'border-amber-900/20 bg-[#f8f6f0]/95 text-amber-950 hover:bg-[#ffffff] shadow-[0_0_15px_rgba(217,119,6,0.15)]'
              : 'border-cyan-500/30 bg-[#0a0e17]/85 text-cyan-300 hover:text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
          }`}
          title={t('Karanlık / aydınlık uzay temasını değiştir', 'Switch dark/light space theme')}
        >
          {theme === 'light' ? `☀️ ${t('AYDINLIK UZAY', 'LIGHT SPACE')}` : `🌌 ${t('KARANLIK UZAY', 'DARK SPACE')}`}
        </button>
        <button
          type="button"
          onClick={() => setUiLanguage((language) => language === 'tr' ? 'en' : 'tr')}
          className="pointer-events-auto rounded-xl border border-cyan-500/25 bg-[#0a0e17]/85 px-3 py-2 font-mono text-[10px] font-semibold text-cyan-200 backdrop-blur-xl"
          aria-label={uiLanguage === 'tr' ? 'Arayüzü İngilizce yap' : 'Switch interface to Turkish'}
        >
          {uiLanguage === 'tr' ? 'TR → EN' : 'EN → TR'}
        </button>
        <button
          type="button"
          onClick={() => setShowAboutModal(true)}
          className="pointer-events-auto rounded-xl border border-cyan-500/25 bg-[#0a0e17]/85 px-3 py-2 font-mono text-[10px] font-semibold text-cyan-200 backdrop-blur-xl"
        >
          {t('VERİ / YÖNTEM', 'DATA / METHOD')}
        </button>
      </div>

      {/* Mobile: Tour button just below search */}
      <div className="absolute left-3 top-[108px] z-20 md:hidden">
        <CosmicTourControls
          currentBodyId={focusBody}
          uiLanguage={uiLanguage}
          language={cinematicTourLanguage}
          isTourActive={isCinematicTourActive}
          isAudioReady={cinematicAudioStatus[cinematicTourLanguage].ready}
          audioError={cinematicAudioStatus[cinematicTourLanguage].error}
          onLanguageChange={setCinematicTourLanguage}
          onStartTour={startCinematicTour}
          onStopTour={stopCinematicTour}
        />
      </div>

      {/* ============ TARGET COORDINATES PIN BADGE ============ */}
      {selectedPin && (
        <div data-hud-surface className="absolute left-3 right-3 top-[155px] z-30 flex items-center gap-3 rounded-xl border border-sky-400/40 bg-[#0a0e14]/85 px-4 py-2.5 backdrop-blur-xl shadow-[0_0_15px_rgba(56,189,248,0.25)] md:left-auto md:right-7 md:top-20 md:w-auto">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-sky-500" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-wider text-sky-400">
              {t('Hedef Koordinatlar', 'Target Coordinates')}
            </div>
            <div className="font-mono text-xs font-semibold text-slate-100 truncate">
              {selectedPin.landingSite
                ? (uiLanguage === 'tr' ? selectedPin.landingSite.nameTr : selectedPin.landingSite.name)
                : selectedPin.text}
            </div>
          </div>
          <button
            onClick={() => setSelectedPin(null)}
            className="ml-2 shrink-0 rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label={t('Seçili koordinatı kapat', 'Close selected coordinates')}
          >
            ✕
          </button>
        </div>
      )}

      {searchNotice && (
        <div
          data-hud-surface
          role="status"
          aria-live="polite"
          className="absolute left-1/2 top-[128px] z-30 w-[min(520px,calc(100vw-24px))] -translate-x-1/2 rounded-xl border border-cyan-400/25 bg-[#091017]/90 px-3 py-2 text-center font-mono text-[9px] text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)] backdrop-blur-xl"
        >
          {searchNotice}
          <button
            type="button"
            onClick={() => setSearchNotice(null)}
            className="ml-2 text-cyan-300/60 hover:text-cyan-200"
            aria-label={uiLanguage === 'tr' ? 'Arama bildirimini kapat' : 'Dismiss search notice'}
          >
            ×
          </button>
        </div>
      )}

      {/* ============ DESKTOP LEFT PANEL: Layer Panel ============ */}
      <div className="absolute bottom-7 left-7 z-20 max-md:hidden">
        <LayerPanel {...layerPanelProps} language={uiLanguage} />
      </div>

      {/* ============ CELESTIAL BODY TRAY ============ */}
      <div className="absolute bottom-[84px] left-1/2 z-20 w-fit max-w-[calc(100vw-48px)] -translate-x-1/2 max-md:bottom-[82px] max-md:max-w-[calc(100vw-24px)]">
        <CelestialTray
          focusBody={focusBody}
          onSelectBody={handleSelectBody}
          language={uiLanguage}
        />
      </div>

      {earthObservatoryOpen && (
        <div className="fixed bottom-[92px] left-3 right-3 z-40 md:absolute md:bottom-7 md:left-auto md:right-7 md:z-40">
          <EarthObservatoryPanel
            {...earthObservatory}
            language={uiLanguage}
            onClose={() => setEarthObservatoryOpen(false)}
            onRefresh={() => void earthObservatory.refresh()}
            onSelectEvent={handleSelectEarthEvent}
            layerVisibility={earthLayerVisibility}
            onToggleLayer={handleToggleEarthLayer}
          />
        </div>
      )}

      {smallBodiesOpen && (
        <div className="fixed bottom-[92px] left-3 right-3 z-40 md:absolute md:bottom-7 md:left-auto md:right-7 md:z-40">
          <SmallBodiesPanel
            {...smallBodies}
            language={uiLanguage}
            onClose={() => setSmallBodiesOpen(false)}
            onRefresh={() => void smallBodies.refresh()}
            onShowApproach={handleShowCloseApproach}
            onFocusBody={handleFocusSmallBody}
          />
        </div>
      )}

      {skywatchOpen && (
        <div className="fixed bottom-[92px] left-3 right-3 z-40 md:absolute md:bottom-7 md:left-auto md:right-7 md:z-40">
          <SkywatchPanel
            events={skywatchEvents}
            observer={skywatchLocation.observer}
            locationError={skywatchLocation.error}
            calculatedAt={skywatchCalculatedAt}
            language={uiLanguage}
            onRequestBrowserLocation={skywatchLocation.requestBrowserLocation}
            onSaveManualLocation={skywatchLocation.saveManualLocation}
            onClearLocation={skywatchLocation.clearLocation}
            onSelectEvent={handleSelectSkywatchEvent}
            onStartPerseidSimulation={handleStartPerseidSimulation}
            onClose={() => setSkywatchOpen(false)}
          />
        </div>
      )}

      {meteorFlowVisible && (
        <MeteorFlowOverlay
          language={uiLanguage}
          onClose={() => setMeteorFlowVisible(false)}
        />
      )}

      {/* ============ MOBILE: FAB + Bottom Sheet ============ */}
      {/* Floating Action Button — bottom-right */}
      <button
        onClick={() => setLayersOpen((v) => !v)}
        className={`pointer-events-auto absolute bottom-[154px] right-3 z-30 h-12 w-12 rounded-full border backdrop-blur-xl shadow-lg transition-all md:hidden flex items-center justify-center text-xl ${
          layersOpen
            ? 'border-cyan-400/60 bg-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.5)] rotate-45'
            : 'border-white/20 bg-[#0a0e14]/80 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
        }`}
        aria-label={layersOpen ? t('Katman panelini kapat', 'Close layers panel') : t('Katman panelini aç', 'Open layers panel')}
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
          <LayerPanel {...layerPanelProps} language={uiLanguage} />
          </div>
        </div>
      </div>

      {/* ============ TIME CONTROLLER (bottom-center) ============ */}
      <div
        className="absolute bottom-4 left-1/2 z-20 max-w-[calc(100vw-24px)] -translate-x-1/2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <TimeController
          clock={clock}
          notices={systemNotices}
          metrics={systemMetrics}
          language={uiLanguage}
        />
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
          language={uiLanguage}
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
      {!selSat && !skywatchOpen && (
        <>
          {/* Desktop only: panel tracks the focused body, top-right until it is on screen */}
          <div
            ref={planetInfoRef}
            className="hidden md:block fixed z-20"
            style={
              planetInfoPlacement
                ? { left: planetInfoPlacement.left, top: planetInfoPlacement.top }
                : { right: 16, top: 16 }
            }
          >
            <PlanetInfoCard
              bodyId={focusBody}
              language={uiLanguage}
              clock={clock}
              observer={skywatchLocation.observer}
            />
          </div>
          {/* Mobile only: slide-up sheet controlled by 🪐 icon */}
          <div className="md:hidden">
            <PlanetInfoCard
              bodyId={focusBody}
              language={uiLanguage}
              clock={clock}
              observer={skywatchLocation.observer}
              mobileExpanded={mobilePlanetInfoOpen}
              onMobileToggle={() => setMobilePlanetInfoOpen(false)}
            />
          </div>
        </>
      )}

      {/* ============ CELESTIAL TARGET CALLOUT ============ */}
      <TargetBodyCallout
        key={`${focusBody}-${uiLanguage}-${bodySelectionRevision}`}
        bodyId={focusBody}
        engineRef={engineRef}
        theme={theme}
        language={uiLanguage}
      />

      {missionTimelineOpen && (
        <div className="fixed bottom-[92px] left-3 right-3 z-40 md:absolute md:bottom-7 md:left-auto md:right-7 md:z-40">
          <MissionTimelinePanel
            language={uiLanguage}
            onSelectEvent={handleSelectMissionEvent}
            onClose={() => setMissionTimelineOpen(false)}
          />
        </div>
      )}

      {/* ============ LANDING SITE MODAL ============ */}
      {selectedPin?.landingSite && (
        <LandingSiteModal
          site={selectedPin.landingSite}
          language={uiLanguage}
          onClose={() => setSelectedPin(null)}
        />
      )}

      {/* ============ SCALE SANDBOX MODAL ============ */}
      {showScaleModal && (
        <ScaleSandboxModal
          language={uiLanguage}
          onClose={() => setShowScaleModal(false)}
        />
      )}

      {showAboutModal && (
        <AboutAstrobenderModal
          language={uiLanguage}
          onClose={() => setShowAboutModal(false)}
        />
      )}

      {/* ============ CONTEXT LOST ============ */}
      {ctxLost && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#04060a]/90">
          <div className="rounded-2xl border border-white/10 bg-[#0a0e14] px-6 py-5 text-center mx-4">
            <div className="text-sm text-slate-200">{t('Grafik bağlamı kayboldu', 'Graphics context lost')}</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg border border-sky-400/40 px-3 py-1 text-xs text-sky-200 hover:bg-sky-400/10"
            >
              {t('Yeniden yükle', 'Reload')}
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
