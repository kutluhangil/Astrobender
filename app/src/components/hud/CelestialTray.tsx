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
  thumbnail: string | null
  moons?: PlanetDef[]
}

const FIXED_BODIES: TrayBody[] = [
  { id: 'sun', name: 'Sun', nameTr: 'Güneş', thumbnail: 'thumb-sun.webp' },
  { id: 'earth', name: 'Earth', nameTr: 'Dünya', thumbnail: 'thumb-earth.webp' },
  { id: 'moon', name: 'Moon', nameTr: 'Ay', thumbnail: 'thumb-moon.webp' },
]

const THUMBNAILS: Partial<Record<CelestialBodyId, string>> = {
  mercury: 'thumb-mercury.webp',
  venus: 'thumb-venus.webp',
  mars: 'thumb-mars.webp',
  jupiter: 'thumb-jupiter.webp',
  saturn: 'thumb-saturn.webp',
  uranus: 'thumb-uranus.webp',
  neptune: 'thumb-neptune.webp',
  pluto: 'thumb-pluto.webp',
  ceres: 'thumb-ceres.webp',
}

const TRAY_BODIES: TrayBody[] = [
  ...FIXED_BODIES,
  ...PLANETS.map((planet) => ({
    id: planet.id,
    name: planet.name,
    nameTr: CELESTIAL_FACTS[planet.id].nameTr,
    thumbnail: THUMBNAILS[planet.id] ?? null,
    moons: planet.moons,
  })),
]

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
      <span className="sr-only">{t('Gök cisimleri', 'Celestial bodies')}</span>
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
                {body.thumbnail ? (
                  <span className="relative h-10 w-10 overflow-hidden rounded-full">
                    <img
                      src={`/textures/${body.thumbnail}`}
                      alt=""
                      width="44"
                      height="44"
                      className={`h-full w-full object-cover transition-transform duration-200 group-hover:scale-110 ${
                        body.id === 'saturn' ? 'scale-x-[1.25]' : ''
                      }`}
                      loading="eager"
                      decoding="async"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.25),transparent_34%,rgba(0,0,0,0.08)_58%,rgba(0,0,0,0.8)_100%)]"
                    />
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-500/60 font-mono text-[9px] text-slate-200"
                  >
                    {body.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
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
                  <img
                    src="/textures/thumb-moon.webp"
                    alt=""
                    width="30"
                    height="30"
                    className="h-7 w-7 rounded-full object-cover opacity-90 transition-transform group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                  />
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
