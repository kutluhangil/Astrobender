import { CELESTIAL_FACTS } from '@/lib/celestial-facts'
import { PLANETS, type CelestialBodyId } from '@/lib/planets'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'
import { useState } from 'react'

interface CelestialTrayProps {
  focusBody: CelestialBodyId
  onSelectBody: (body: CelestialBodyId) => void
  language: UiLanguage
}

interface TrayChild {
  id: CelestialBodyId
  name: string
  thumbnail: string | null
}

interface TrayBody {
  id: CelestialBodyId | 'small-bodies'
  name: string
  nameTr: string
  thumbnail: string | null
  /** A moon system opens its moons; the small-body drawer opens dwarf planets and asteroids. */
  childKind: 'moon' | 'small-body' | null
  children?: TrayChild[]
}

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

/**
 * Dwarf planets, asteroids and trans-Neptunian bodies share one drawer. Keeping
 * them inline would push the tray past the viewport once the catalog grew past
 * the eight planets, and the row is the primary navigation control.
 */
const SMALL_BODY_IDS: readonly CelestialBodyId[] = [
  'ceres',
  'vesta',
  'pallas',
  'hygiea',
  'juno',
  'psyche',
  'haumea',
  'makemake',
  'eris',
  'quaoar',
  'gonggong',
  'sedna',
]

const FIXED_BODIES: TrayBody[] = [
  { id: 'sun', name: 'Sun', nameTr: 'Güneş', thumbnail: 'thumb-sun.webp', childKind: null },
  {
    id: 'earth',
    name: 'Earth',
    nameTr: 'Dünya',
    thumbnail: 'thumb-earth.webp',
    childKind: 'moon',
    children: [{ id: 'moon', name: 'Moon', thumbnail: 'thumb-moon.webp' }],
  },
  { id: 'moon', name: 'Moon', nameTr: 'Ay', thumbnail: 'thumb-moon.webp', childKind: null },
]

const SMALL_BODY_DRAWER: TrayBody = {
  id: 'small-bodies',
  name: 'Small bodies',
  nameTr: 'Küçük cisimler',
  thumbnail: null,
  childKind: 'small-body',
  children: SMALL_BODY_IDS.map((id) => ({
    id,
    name: CELESTIAL_FACTS[id].name,
    thumbnail: THUMBNAILS[id] ?? null,
  })),
}

const TRAY_BODIES: TrayBody[] = [
  ...FIXED_BODIES,
  ...PLANETS.filter((planet) => !SMALL_BODY_IDS.includes(planet.id)).map((planet) => ({
    id: planet.id,
    name: planet.name,
    nameTr: CELESTIAL_FACTS[planet.id].nameTr,
    thumbnail: THUMBNAILS[planet.id] ?? null,
    childKind: planet.moons?.length ? ('moon' as const) : null,
    children: planet.moons?.map((moon) => ({
      id: moon.id,
      name: moon.name,
      thumbnail: 'thumb-moon.webp',
    })),
  })),
  SMALL_BODY_DRAWER,
]

function bodyLabel(body: TrayBody, language: UiLanguage): string {
  return language === 'tr' ? body.nameTr : body.name
}

function childLabel(child: TrayChild, language: UiLanguage): string {
  return language === 'tr' ? CELESTIAL_FACTS[child.id].nameTr : child.name
}

function Initials({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-500/60 font-mono text-[9px] text-slate-200"
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}

export default function CelestialTray({ focusBody, onSelectBody, language }: CelestialTrayProps) {
  const [openDrawerId, setOpenDrawerId] = useState<TrayBody['id'] | null>(() =>
    TRAY_BODIES.find((body) => body.children?.some((child) => child.id === focusBody))?.id ?? null,
  )
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const activeDrawer = TRAY_BODIES.find((body) => body.id === openDrawerId)

  const drawerTitle = (body: TrayBody) =>
    body.childKind === 'small-body'
      ? t('Küçük cisimler', 'Small bodies')
      : t(`${bodyLabel(body, language)} uyduları`, `${bodyLabel(body, language)} moons`)

  return (
    <nav
      data-hud-surface
      aria-label={t('Gök cismi seçici', 'Celestial body selector')}
      className="pointer-events-auto relative inline-block max-w-full rounded-[28px] border border-white/10 bg-[#06090e]/85 px-3 py-2.5 shadow-[0_14px_40px_rgba(0,0,0,0.58)] backdrop-blur-2xl"
      onMouseLeave={() => setOpenDrawerId(null)}
    >
      <span className="sr-only">{t('Gök cisimleri', 'Celestial bodies')}</span>
      <div className="flex max-w-full items-center gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-none">
        {TRAY_BODIES.map((body) => {
          const childCount = body.children?.length ?? 0
          const hasChildren = childCount > 0
          const isCurrentDrawer = openDrawerId === body.id
          const isDrawerOnly = body.id === 'small-bodies'
          const isFocused = !isDrawerOnly && focusBody === body.id
          const holdsFocusedChild = body.children?.some((child) => child.id === focusBody) ?? false
          const label = bodyLabel(body, language)
          const ariaLabel = isDrawerOnly
            ? t(`Küçük cisimler · ${childCount} cisim`, `Small bodies · ${childCount} bodies`)
            : hasChildren
              ? `${label} · ${childCount} ${t('uydu seçeneği', 'moon options')}`
              : label

          return (
            <div
              key={body.id}
              className="relative shrink-0"
              onMouseEnter={() => hasChildren && setOpenDrawerId(body.id)}
            >
              <button
                type="button"
                onClick={() => {
                  setOpenDrawerId(hasChildren ? body.id : null)
                  if (!isDrawerOnly) onSelectBody(body.id as CelestialBodyId)
                }}
                onFocus={() => hasChildren && setOpenDrawerId(body.id)}
                className={`group relative flex h-11 w-11 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 ${
                  isFocused || (isDrawerOnly && holdsFocusedChild)
                    ? 'border-cyan-300/80 bg-cyan-400/15 shadow-[0_0_0_3px_rgba(34,211,238,0.11),0_0_22px_rgba(34,211,238,0.3)]'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.08]'
                }`}
                aria-label={ariaLabel}
                aria-pressed={isDrawerOnly ? undefined : isFocused}
                aria-haspopup={hasChildren ? 'true' : undefined}
                aria-expanded={hasChildren ? isCurrentDrawer : undefined}
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
                ) : isDrawerOnly ? (
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-slate-600/45 text-[13px] leading-none"
                  >
                    🪨
                  </span>
                ) : (
                  <Initials name={body.name} />
                )}
                {hasChildren && (
                  <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-slate-500/60 bg-[#070a0f] px-1 font-mono text-[8px] tabular-nums text-slate-300">
                    {childCount}
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>
      {activeDrawer?.children && activeDrawer.children.length > 0 && (
        <div className="absolute bottom-full left-1/2 z-30 -translate-x-1/2 pb-4">
          <div
            className="relative w-max max-w-[min(88vw,360px)] rounded-2xl border border-white/10 bg-[#080c12]/95 px-3 py-2.5 shadow-[0_16px_46px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
            role="group"
            aria-label={drawerTitle(activeDrawer)}
          >
            <div className="mb-2 text-center font-mono text-[8px] uppercase tracking-[0.24em] text-slate-500">
              {drawerTitle(activeDrawer)}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {activeDrawer.children.map((child) => {
                const label = childLabel(child, language)
                const childFocused = focusBody === child.id
                const selectLabel =
                  activeDrawer.childKind === 'small-body'
                    ? t(`${label} cismini seç`, `Select ${label}`)
                    : t(`${label} uydusunu seç`, `Select ${label} moon`)

                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => onSelectBody(child.id)}
                    className={`group flex w-12 flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 ${
                      childFocused ? 'bg-cyan-400/15 text-cyan-100' : 'text-white/80 hover:bg-white/8 hover:text-white'
                    }`}
                    aria-label={selectLabel}
                    aria-pressed={childFocused}
                  >
                    {child.thumbnail ? (
                      <img
                        src={`/textures/${child.thumbnail}`}
                        alt=""
                        width="30"
                        height="30"
                        className="h-7 w-7 rounded-full object-cover opacity-90 transition-transform group-hover:scale-110"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-slate-500/50 font-mono text-[8px] text-slate-200"
                      >
                        {child.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="max-w-full truncate font-mono text-[8px]">{label}</span>
                  </button>
                )
              })}
            </div>
            <span
              aria-hidden="true"
              className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-white/10 bg-[#080c12]"
            />
          </div>
        </div>
      )}
    </nav>
  )
}
