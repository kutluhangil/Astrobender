import { CELESTIAL_FACTS } from '@/lib/celestial-facts'
import { PLANETS, type CelestialBodyId, type PlanetDef } from '@/lib/planets'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'
import { useState } from 'react'

interface CelestialTrayProps {
  focusBody: CelestialBodyId
  onSelectBody: (body: CelestialBodyId) => void
  language: UiLanguage
}

interface TrayBody {
  id: CelestialBodyId
  name: string
  nameTr: string
  moons?: PlanetDef[]
}

const FIXED_BODIES: TrayBody[] = [
  { id: 'sun', name: 'Sun', nameTr: 'Güneş' },
  { id: 'earth', name: 'Earth', nameTr: 'Dünya' },
  { id: 'moon', name: 'Moon', nameTr: 'Ay' },
]

const TRAY_BODIES: TrayBody[] = [
  ...FIXED_BODIES,
  ...PLANETS.map((planet) => ({
    id: planet.id,
    name: planet.name,
    nameTr: CELESTIAL_FACTS[planet.id].nameTr,
    moons: planet.moons,
  })),
]

const SURFACE_PALETTES: Partial<Record<CelestialBodyId, readonly [string, string, string]>> = {
  sun: ['#fff7ae', '#f59e0b', '#9a3412'],
  mercury: ['#d8d4cd', '#77716a', '#2d2926'],
  venus: ['#fee2a8', '#d97706', '#7c2d12'],
  earth: ['#b7f1ef', '#1477b8', '#062653'],
  moon: ['#e5e7eb', '#7c838c', '#20242b'],
  mars: ['#f4b49b', '#c2410c', '#5b1d15'],
  jupiter: ['#ffe0bd', '#b86d47', '#57251b'],
  saturn: ['#f7e6b5', '#c5a569', '#66533a'],
  uranus: ['#c5f2f0', '#48a6bf', '#164e63'],
  neptune: ['#b7cdfd', '#3264bd', '#172554'],
  pluto: ['#eee6dd', '#8d7568', '#3f322c'],
  ceres: ['#e4e4e7', '#8b8b92', '#3f3f46'],
}

function schematicSurfaceStyle(id: CelestialBodyId) {
  const palette = SURFACE_PALETTES[id] ?? ['#d9dce2', '#737983', '#252a33']
  return {
    background: `radial-gradient(circle at 31% 28%, ${palette[0]} 0 12%, transparent 34%), repeating-linear-gradient(18deg, ${palette[1]} 0 3px, ${palette[2]} 4px 8px)`,
  }
}

function bodyLabel(body: TrayBody, language: UiLanguage): string {
  return language === 'tr' ? body.nameTr : body.name
}

export default function CelestialTray({ focusBody, onSelectBody, language }: CelestialTrayProps) {
  const [moonSystemId, setMoonSystemId] = useState<CelestialBodyId | null>(() =>
    PLANETS.find((planet) => planet.moons?.some((moon) => moon.id === focusBody))?.id ?? null,
  )
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const activeMoonSystem = TRAY_BODIES.find((body) => body.id === moonSystemId)

  return (
    <nav
      data-hud-surface
      aria-label={t('Gök cismi seçici', 'Celestial body selector')}
      className="pointer-events-auto relative inline-block max-w-full rounded-[28px] border border-white/10 bg-[#06090e]/85 px-3 py-2.5 shadow-[0_14px_40px_rgba(0,0,0,0.58)] backdrop-blur-2xl"
      onMouseLeave={() => setMoonSystemId(null)}
    >
      <span className="sr-only">
        {t('Gök cisimleri; yüzey simgeleri şematiktir.', 'Celestial bodies; surface icons are schematic.')}
      </span>
      <div className="flex max-w-full items-center gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-none">
        {TRAY_BODIES.map((body) => {
          const moonCount = body.moons?.length ?? (body.id === 'earth' ? 1 : 0)
          const hasMoons = moonCount > 0
          const isCurrentSystem = moonSystemId === body.id
          const isFocused = focusBody === body.id
          const label = bodyLabel(body, language)

          return (
            <div
              key={body.id}
              className="relative shrink-0"
              onMouseEnter={() => hasMoons && setMoonSystemId(body.id)}
            >
              <button
                type="button"
                onClick={() => {
                  setMoonSystemId(hasMoons ? body.id : null)
                  onSelectBody(body.id)
                }}
                onFocus={() => hasMoons && setMoonSystemId(body.id)}
                className={`group relative flex h-11 w-11 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 ${
                  isFocused
                    ? 'border-cyan-300/80 bg-cyan-400/15 shadow-[0_0_0_3px_rgba(34,211,238,0.11),0_0_22px_rgba(34,211,238,0.3)]'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.08]'
                }`}
                aria-label={hasMoons ? `${label} · ${moonCount} ${t('uydu seçeneği', 'moon options')}` : label}
                aria-pressed={isFocused}
                aria-haspopup={hasMoons ? 'true' : undefined}
                aria-expanded={hasMoons ? isCurrentSystem : undefined}
              >
                <span
                  aria-hidden="true"
                  style={schematicSurfaceStyle(body.id)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/20 font-mono text-[9px] font-bold text-white/90 shadow-inner transition-transform duration-200 group-hover:scale-110 ${
                    body.id === 'saturn' ? 'scale-x-[1.25]' : ''
                  }`}
                >
                  {body.name.slice(0, 2).toUpperCase()}
                </span>
                {hasMoons && (
                  <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-slate-500/60 bg-[#070a0f] px-1 font-mono text-[8px] tabular-nums text-slate-300">
                    {moonCount}
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>
      {activeMoonSystem?.moons && activeMoonSystem.moons.length > 0 && (
        <div
          className="absolute bottom-[calc(100%+16px)] left-1/2 z-30 w-max max-w-[min(88vw,360px)] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#080c12]/95 px-3 py-2.5 shadow-[0_16px_46px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
          role="group"
          aria-label={t(`${bodyLabel(activeMoonSystem, language)} uyduları`, `${bodyLabel(activeMoonSystem, language)} moons`)}
        >
          <div className="mb-2 text-center font-mono text-[8px] uppercase tracking-[0.24em] text-slate-500">
            {t(`${bodyLabel(activeMoonSystem, language)} uyduları`, `${bodyLabel(activeMoonSystem, language)} moons`)}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {activeMoonSystem.moons.map((moon) => {
              const moonLabel = language === 'tr' ? CELESTIAL_FACTS[moon.id].nameTr : moon.name
              const moonFocused = focusBody === moon.id

              return (
                <button
                  key={moon.id}
                  type="button"
                  onClick={() => onSelectBody(moon.id)}
                  className={`group flex w-12 flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 ${
                    moonFocused ? 'bg-cyan-400/15 text-cyan-100' : 'text-white/80 hover:bg-white/8 hover:text-white'
                  }`}
                  aria-label={t(`${moonLabel} uydusunu seç`, `Select ${moonLabel} moon`)}
                  aria-pressed={moonFocused}
                >
                  <span
                    aria-hidden="true"
                    style={schematicSurfaceStyle(moon.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 font-mono text-[7px] font-bold text-white/90 transition-transform group-hover:scale-110"
                  >
                    {moon.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="max-w-full truncate font-mono text-[8px]">{moonLabel}</span>
                </button>
              )
            })}
          </div>
          <span
            aria-hidden="true"
            className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-white/10 bg-[#080c12]"
          />
        </div>
      )}
    </nav>
  )
}
