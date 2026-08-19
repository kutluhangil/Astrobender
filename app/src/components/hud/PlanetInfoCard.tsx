import { useState } from 'react'
import { getSignatureMetrics, type SignatureMetric } from '@/lib/body-comparison'
import { getCelestialEntry } from '@/lib/celestial-catalog'
import {
  CELESTIAL_FUN_FACTS_EN,
  celestialTypeEn,
  celestialValueEn,
} from '@/lib/celestial-facts'
import {
  CELESTIAL_PHYSICAL_PROFILES,
  JPL_PHYSICAL_PARAMETERS_URL,
  JPL_SATELLITE_PARAMETERS_URL,
  physicalProfileValue,
  type CelestialPhysicalProfile,
} from '@/lib/celestial-physical-profiles'
import { findPlanetDef, type CelestialBodyId, type RingSystem } from '@/lib/planets'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'
import { formatSourceReviewStatus, getSourceFreshness } from '@/lib/source-governance'

interface PlanetInfoCardProps {
  bodyId: CelestialBodyId
  /** Mobile: whether the card is expanded (controlled from Home) */
  mobileExpanded?: boolean
  onMobileToggle?: () => void
  language?: UiLanguage
}

/**
 * The three values that lead the panel. Everything below them is disclosed on
 * demand, which is what keeps the panel from being one undifferentiated column
 * where radius, chemistry and a source date all carry the same visual weight.
 */
function SignatureRow({ metrics }: { metrics: SignatureMetric[] }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {metrics.map((metric) => (
        <div key={metric.key} className="hud-tile px-2 py-1.5">
          <div className="font-mono text-[7.5px] uppercase tracking-[0.14em] text-slate-500">
            {metric.label}
          </div>
          <div className="mt-1 font-mono text-[11px] font-medium leading-tight text-slate-100">
            {metric.value}
          </div>
          {metric.comparison && (
            <div className="mt-0.5 text-[8.5px] leading-snug text-cyan-300/70">
              {metric.comparison}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function Disclosure({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <details className="hud-disclosure mt-1.5">
      <summary>
        <span>
          {title}
          {count !== undefined && <span className="ml-1.5 text-slate-600">{count}</span>}
        </span>
      </summary>
      <div className="px-0.5 pb-1 pt-1.5">{children}</div>
    </details>
  )
}

function MetricGrid({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {rows.map((row) => (
        <div key={row.label} className="hud-tile px-2 py-1.5">
          <div className="font-mono text-[7.5px] uppercase tracking-[0.14em] text-slate-500">
            {row.label}
          </div>
          <div className="mt-0.5 font-mono text-[10px] font-medium leading-snug text-slate-200">
            {row.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function ScienceProfile({
  profile,
  language,
}: {
  profile: CelestialPhysicalProfile
  language: UiLanguage
}) {
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const temperature = language === 'tr'
    ? profile.temperature.replace(' to ', ' ile ')
    : profile.temperature

  return (
    <>
      <MetricGrid
        rows={[
          { label: t('Kütle', 'Mass'), value: physicalProfileValue(profile.mass, language) },
          { label: t('Yoğunluk', 'Density'), value: physicalProfileValue(profile.density, language) },
          { label: t('Yerçekimi', 'Surface gravity'), value: physicalProfileValue(profile.gravity, language) },
          { label: t('Sıcaklık', 'Temperature'), value: temperature },
        ]}
      />
      <p className="hud-tile mt-1.5 px-2 py-2 text-[10px] leading-relaxed text-slate-300">
        {language === 'tr' ? profile.chemistry.tr : profile.chemistry.en}
      </p>
    </>
  )
}

function RingBands({ ring, language }: { ring: RingSystem; language: UiLanguage }) {
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const bands = ring.bands ?? []
  const narrowCount = bands.filter((band) => band.narrow).length

  return (
    <>
      {bands.length > 0 ? (
        <ul className="flex flex-wrap gap-1">
          {bands.map((band) => (
            <li
              key={band.name}
              className="hud-tile px-1.5 py-0.5 font-mono text-[9px] text-slate-200"
            >
              {band.name}
              {band.narrow && <span className="ml-1 text-amber-300/80">*</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[10px] leading-relaxed text-slate-300">
          {t(
            'Bantlar tek bir dokulu halka olarak çiziliyor.',
            'The bands are drawn as a single textured ring.',
          )}
        </p>
      )}
      {narrowCount > 0 && (
        <p className="mt-1.5 text-[9px] leading-relaxed text-amber-200/75">
          {t(
            `* ${narrowCount} dar halka ölçülen genişliğinden daha kalın çiziliyor; gerçek genişlikleri bir pikselden ince.`,
            `* ${narrowCount} narrow rings are drawn wider than measured; their true widths are thinner than one pixel.`,
          )}
        </p>
      )}
    </>
  )
}

/** Every citation the panel carries, collected into one strip under the content. */
function SourceStrip({
  language,
  catalogUrl,
  verifiedAt,
  physicalUrl,
  ringUrl,
}: {
  language: UiLanguage
  catalogUrl: string
  verifiedAt: string
  physicalUrl: string
  ringUrl?: string
}) {
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const freshness = getSourceFreshness(verifiedAt)
  const links: Array<{ href: string; label: string }> = [
    { href: catalogUrl, label: t('NASA kaynağı', 'NASA source') },
    { href: physicalUrl, label: t('JPL fiziksel veri', 'JPL physical data') },
    ...(ringUrl ? [{ href: ringUrl, label: t('PDS halka verisi', 'PDS ring data') }] : []),
  ]

  return (
    <div className="mt-2 border-t border-white/[0.07] pt-2">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[8px] uppercase tracking-[0.14em]">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="text-cyan-400/70 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-cyan-200"
          >
            {link.label} ↗
          </a>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[8px] tracking-[0.1em] text-slate-600">
        <span>{verifiedAt}</span>
        <span
          className={freshness.state === 'current' ? 'text-emerald-300/70' : 'text-amber-300/85'}
        >
          {formatSourceReviewStatus(freshness, language)}
        </span>
      </div>
    </div>
  )
}

function BodyPanelContent({
  bodyId,
  language,
}: {
  bodyId: CelestialBodyId
  language: UiLanguage
}) {
  const entry = getCelestialEntry(bodyId)
  const fact = entry.fact
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const value = (text: string) => (language === 'tr' ? text : celestialValueEn(text))
  const bodyType = language === 'tr' ? fact.typeTr : celestialTypeEn(fact.typeTr)
  const funFact = language === 'tr' ? fact.funFactTr : CELESTIAL_FUN_FACTS_EN[bodyId]
  const profile = CELESTIAL_PHYSICAL_PROFILES[bodyId]
  const ring = findPlanetDef(bodyId)?.ring
  const physicalSourceUrl =
    bodyType.includes('Planet') || bodyType.includes('Gezegen') || bodyId === 'sun'
      ? JPL_PHYSICAL_PARAMETERS_URL
      : JPL_SATELLITE_PARAMETERS_URL

  return (
    <>
      <SignatureRow metrics={getSignatureMetrics(bodyId, language)} />

      <p className="mt-2 px-0.5 text-[10.5px] leading-relaxed text-cyan-100/85">{funFact}</p>

      <Disclosure title={t('Yörünge ve dönüş', 'Orbit & rotation')}>
        <MetricGrid
          rows={[
            { label: t('Eksen dönüşü', 'Rotation'), value: value(fact.rotationPeriod) },
            { label: t('Yörünge periyodu', 'Orbital period'), value: value(fact.orbitPeriod) },
            { label: t("Güneş'e uzaklık", 'Distance from Sun'), value: value(fact.distFromSunAu) },
            { label: t('Atmosfer', 'Atmosphere'), value: value(fact.atmosphere) },
          ]}
        />
      </Disclosure>

      <Disclosure title={t('Fiziksel profil', 'Physical profile')}>
        <ScienceProfile profile={profile} language={language} />
      </Disclosure>

      {ring && (
        <Disclosure title={t('Halka sistemi', 'Ring system')} count={ring.bands?.length}>
          <RingBands ring={ring} language={language} />
        </Disclosure>
      )}

      <SourceStrip
        language={language}
        catalogUrl={entry.sourceUrl}
        verifiedAt={entry.verifiedAt}
        physicalUrl={physicalSourceUrl}
        ringUrl={ring?.sourceUrl}
      />
    </>
  )
}

function BodyHeader({
  bodyId,
  language,
  action,
}: {
  bodyId: CelestialBodyId
  language: UiLanguage
  action: React.ReactNode
}) {
  const fact = getCelestialEntry(bodyId).fact
  const primaryName = language === 'tr' ? fact.nameTr : fact.name
  const secondaryName = language === 'tr' ? fact.name : fact.nameTr
  const bodyType = language === 'tr' ? fact.typeTr : celestialTypeEn(fact.typeTr)

  return (
    <div className="flex items-start justify-between gap-2 border-b border-white/[0.07] px-0.5 pb-2">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]">
          {fact.emoji}
        </span>
        <div className="min-w-0">
          <span className="hud-eyebrow">{bodyType}</span>
          <h3 className="mt-1 truncate font-display text-[17px] font-semibold uppercase leading-tight tracking-[0.04em] text-slate-50">
            {primaryName}{' '}
            <span className="font-mono text-[10px] font-normal normal-case tracking-normal text-slate-500">
              ({secondaryName})
            </span>
          </h3>
        </div>
      </div>
      {action}
    </div>
  )
}

export default function PlanetInfoCard({
  bodyId,
  mobileExpanded = false,
  onMobileToggle,
  language = 'tr',
}: PlanetInfoCardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)

  return (
    <>
      {/* ===== DESKTOP: always visible panel beside the focused body ===== */}
      <div
        data-hud-surface
        className="hud-shell pointer-events-auto hidden w-[326px] max-w-[calc(100vw-32px)] backdrop-blur-2xl transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] animate-in fade-in slide-in-from-right-4 md:block"
      >
        <div className="hud-core max-h-[calc(100vh-160px)] overflow-y-auto p-3">
          <BodyHeader
            bodyId={bodyId}
            language={language}
            action={
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                aria-label={
                  collapsed
                    ? t('Gezegen bilgi kartını genişlet', 'Expand body information')
                    : t('Gezegen bilgi kartını daralt', 'Collapse body information')
                }
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 font-mono text-[10px] leading-none text-slate-300 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.1] active:scale-95"
              >
                {collapsed ? '＋' : '－'}
              </button>
            }
          />
          {!collapsed && (
            <div className="mt-2">
              <BodyPanelContent bodyId={bodyId} language={language} />
            </div>
          )}
        </div>
      </div>

      {/* ===== MOBILE: slide-up sheet when expanded ===== */}
      {mobileExpanded && (
        <div
          data-hud-surface
          className="hud-shell pointer-events-auto fixed bottom-[148px] left-3 right-3 z-30 backdrop-blur-2xl animate-in slide-in-from-bottom-4 duration-700 md:hidden"
        >
          <div className="hud-core max-h-[calc(100vh-184px)] overflow-y-auto p-3">
            <BodyHeader
              bodyId={bodyId}
              language={language}
              action={
                <button
                  type="button"
                  onClick={onMobileToggle}
                  aria-label={t('Gezegen bilgi kartını kapat', 'Close body information')}
                  className="shrink-0 rounded-full border border-white/10 bg-white/[0.08] p-1.5 text-slate-300 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95"
                >
                  <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 stroke-current" strokeWidth="1.4">
                    <path d="M1 1l8 8M9 1l-8 8" />
                  </svg>
                </button>
              }
            />
            <div className="mt-2">
              <BodyPanelContent bodyId={bodyId} language={language} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
