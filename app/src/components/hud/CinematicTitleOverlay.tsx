import { useEffect, useState } from 'react'
import type { CelestialBodyId } from '@/lib/planets'
import { CELESTIAL_FACTS } from '@/lib/celestial-facts'

interface CinematicTitleOverlayProps {
  bodyId: CelestialBodyId
}

const CONTROL_SECTORS: Record<CelestialBodyId, { sector: string; code: string }> = {
  sun: { sector: 'CENTRAL CORE // SOL-PRIME', code: 'STATUS: ACTIVE DYNAMIC FUSION' },
  mercury: { sector: 'INNER RIM // SECTOR-01', code: 'ENVIRONMENT: EXTREME THERMAL' },
  venus: { sector: 'ATMOSPHERIC SECTOR // SECTOR-02', code: 'STATUS: DENSE CO2 VEIL' },
  earth: { sector: 'EXECUTIVE HOMEWORLD // SECTOR-03', code: 'STATUS: HABITABLE TERRA' },
  moon: { sector: 'LUNAR SECTOR // SECTOR-03 B', code: 'STATUS: LUNA REGOLITH' },
  mars: { sector: 'RESEARCH SECTOR // SECTOR-04', code: 'STATUS: RED REGOLITH' },
  phobos: { sector: 'AREAN ORBITAL // SECTOR-04 A', code: 'STATUS: MARTIAN SATELLITE' },
  deimos: { sector: 'AREAN ORBITAL // SECTOR-04 B', code: 'STATUS: MARTIAN SATELLITE' },
  jupiter: { sector: 'JOVIAN SECTOR // SECTOR-05', code: 'STATUS: GAS GIANT KING' },
  io: { sector: 'JOVIAN MOON // SECTOR-05 A', code: 'STATUS: HIGH VOLCANISM' },
  europa: { sector: 'JOVIAN MOON // SECTOR-05 B', code: 'STATUS: SUB-ICE OCEAN' },
  ganymede: { sector: 'JOVIAN MOON // SECTOR-05 C', code: 'STATUS: MAGNETOSPHERE' },
  callisto: { sector: 'JOVIAN MOON // SECTOR-05 D', code: 'STATUS: ANCIENT CRATERS' },
  saturn: { sector: 'RINGWORLD SECTOR // SECTOR-06', code: 'STATUS: ICE RING DYNAMICS' },
  titan: { sector: 'SATURNIAN MOON // SECTOR-06 A', code: 'STATUS: METHANE LAKES' },
  enceladus: { sector: 'SATURNIAN MOON // SECTOR-06 B', code: 'STATUS: CRYO-GEYSERS' },
  uranus: { sector: 'ICE GIANT SECTOR // SECTOR-07', code: 'STATUS: AXIAL TILT 97.7°' },
  titania: { sector: 'URANIAN MOON // SECTOR-07 A', code: 'STATUS: ICE CANYONS' },
  oberon: { sector: 'URANIAN MOON // SECTOR-07 B', code: 'STATUS: ANCIENT BASIN' },
  neptune: { sector: 'DEEP FROST SECTOR // SECTOR-08', code: 'STATUS: SUPERSONIC WINDS' },
  triton: { sector: 'NEPTUNIAN MOON // SECTOR-08 A', code: 'STATUS: RETROGRADE ORBIT' },
  pluto: { sector: 'KUIPER SECTOR // SECTOR-09', code: 'STATUS: KUIPER BELT RIM' },
}

export default function CinematicTitleOverlay({ bodyId }: CinematicTitleOverlayProps) {
  const [active, setActive] = useState(true)

  const fact = CELESTIAL_FACTS[bodyId]
  const info = CONTROL_SECTORS[bodyId] ?? { sector: 'UNKNOWN SECTOR', code: 'STATUS: UNKNOWN' }

  useEffect(() => {
    const timer = setTimeout(() => {
      setActive(false)
    }, 4500)
    return () => clearTimeout(timer)
  }, [])

  if (!fact) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center select-none overflow-hidden">
      {/* Remedy's CONTROL Game Style Location Card Banner */}
      <div
        className={`flex flex-col items-center text-center transition-all duration-1000 ease-out transform ${
          active
            ? 'opacity-100 scale-100 blur-0 translate-y-0'
            : 'opacity-0 scale-105 blur-sm -translate-y-2'
        }`}
      >
        {/* Control Subtitle / Sector Line */}
        <div className="font-mono text-[10px] md:text-xs tracking-[0.45em] text-cyan-400 font-bold uppercase mb-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)] flex items-center gap-3">
          <span className="h-[2px] w-6 bg-cyan-400/80" />
          <span>{info.sector}</span>
          <span className="h-[2px] w-6 bg-cyan-400/80" />
        </div>

        {/* Control Giant Brutalist Location Title */}
        <div className="relative px-6 py-1">
          <h2
            className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-[0.35em] text-white uppercase drop-shadow-[0_0_35px_rgba(255,255,255,0.7)]"
          >
            {fact.name}
          </h2>
        </div>

        {/* Control Bottom Line & Technical Specs */}
        <div className="mt-3 flex flex-col items-center gap-1.5">
          {/* Brutalist Red/Cyan Line */}
          <div className="h-[3px] w-36 bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,1)]" />

          <div className="font-display-heavy font-black text-[11px] md:text-xs tracking-[0.3em] text-slate-300 uppercase mt-1">
            {info.code}
          </div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-slate-400 uppercase">
            {fact.typeTr} · RADIUS: {fact.radiusKm}
          </div>
        </div>
      </div>
    </div>
  )
}
