import { useState } from 'react'
import {
  JPL_CAD_SOURCE_URL,
  NAMED_SMALL_BODIES,
  lunarDistances,
  upcomingCloseApproaches,
  type CloseApproach,
  type CloseApproachHighlight,
} from '@/lib/jpl-small-bodies'
import { COMETS, COMET_DRIFT_REFERENCE_DATE } from '@/lib/comets'
import type { CelestialBodyId } from '@/lib/planets'
import { DEEP_SPACE_PROBES } from '@/lib/probes'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface SmallBodiesPanelProps {
  status: 'idle' | 'loading' | 'ready' | 'error'
  approaches: CloseApproach[]
  error: string | null
  updatedAt: number | null
  onClose: () => void
  onRefresh: () => void
  onShowApproach: (highlight: CloseApproachHighlight) => void
  onFocusBody: (bodyId: CelestialBodyId) => void
  language?: UiLanguage
}

type PanelTab = 'approaches' | 'catalog' | 'comets' | 'missions'

function distanceLabel(distanceAu: number): string {
  return `${distanceAu.toFixed(4)} AU`
}

function lunarDistanceLabel(distanceAu: number): string {
  return `${lunarDistances(distanceAu).toFixed(1)} LD`
}

export default function SmallBodiesPanel({
  status,
  approaches,
  error,
  updatedAt,
  onClose,
  onRefresh,
  onShowApproach,
  onFocusBody,
  language = 'tr',
}: SmallBodiesPanelProps) {
  const [tab, setTab] = useState<PanelTab>('approaches')
  const [selected, setSelected] = useState<CloseApproach | null>(null)
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  // `updatedAt` is the fetch time, so the upcoming window is measured from the
  // instant the feed was read rather than from an unrelated render-time clock.
  const upcoming = updatedAt === null ? [] : upcomingCloseApproaches(approaches, updatedAt)

  return (
    <section
      data-hud-surface
      aria-label={t('JPL Küçük Cisim Gözlemevi', 'JPL Small-Body Observatory')}
      className="pointer-events-auto w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-amber-400/25 bg-[#120e08]/94 shadow-[0_0_36px_rgba(245,158,11,0.1)] backdrop-blur-2xl"
    >
      <header className="flex items-start justify-between border-b border-white/10 px-3.5 py-3">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-amber-300/70">
            {t('JPL Küçük Cisim Verisi', 'JPL Small-Body Data')}
          </div>
          <h2 className="mt-0.5 font-mono text-sm font-bold tracking-[0.1em] text-amber-100">
            {t('KÜÇÜK CİSİM GÖZLEMEVİ', 'SMALL-BODY OBSERVATORY')}
          </h2>
          <p className="mt-1 font-mono text-[8px] text-slate-500">
            CAD · SBDB · NASA MISSIONS
            {updatedAt ? ` · ${new Date(updatedAt).toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US')}` : ''}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onRefresh}
            disabled={status === 'loading'}
            aria-label={t('JPL verilerini yenile', 'Refresh JPL data')}
            className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 font-mono text-[10px] text-amber-200 disabled:opacity-40"
          >
            ↻
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Küçük Cisim Gözlemevini kapat', 'Close Small-Body Observatory')}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="grid grid-cols-4 border-b border-white/10 p-1">
        {([
          ['approaches', `${t('Geçiş', 'Passes')} ${upcoming.length}`],
          ['catalog', `${t('Katalog', 'Catalog')} ${NAMED_SMALL_BODIES.length}`],
          ['comets', `${t('Kuyruklu', 'Comets')} ${COMETS.length}`],
          ['missions', `${t('Görev', 'Missions')} ${DEEP_SPACE_PROBES.length}`],
        ] as const).map(([id, label]) => (
          <button
            type="button"
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-md px-2 py-1.5 font-mono text-[8px] transition-colors ${
              tab === id ? 'bg-amber-400/15 text-amber-200' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="max-h-[44vh] overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-white/10">
        {tab === 'approaches' && (
          <div className="space-y-1.5">
            {status === 'loading' && (
              <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 font-mono text-[9px] text-amber-100">
                {t('JPL yakın geçiş verileri alınıyor…', 'Loading JPL close-approach data…')}
              </p>
            )}
            {error && (
              <details className="rounded-lg border border-red-400/25 bg-red-400/5 p-2.5 font-mono text-[9px] text-red-200">
                <summary>{t('JPL CAD verisi alınamadı', 'JPL CAD data unavailable')}</summary>
                <p className="mt-1 break-words text-[8px] text-red-200/70">{error}</p>
              </details>
            )}
            {status === 'ready' && upcoming.length === 0 && !error && (
              <p className="rounded-lg border border-white/7 bg-white/[0.03] p-3 font-mono text-[9px] text-slate-400">
                {t(
                  'Önümüzdeki 60 gün için 0.2 AU içinde kayıtlı yakın geçiş yok.',
                  'No close approach within 0.2 au is on record for the next 60 days.',
                )}
              </p>
            )}
            {upcoming.slice(0, 24).map((highlight) => (
              <div
                key={`${highlight.approach.designation}-${highlight.approach.closeApproachDate}`}
                className={`rounded-lg border transition-colors ${
                  selected === highlight.approach
                    ? 'border-amber-400/50 bg-amber-400/12'
                    : 'border-white/7 bg-white/[0.03] hover:border-amber-400/25'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelected(highlight.approach)}
                  className="w-full px-2.5 py-2 text-left"
                >
                  <span className="block truncate text-[10px] font-medium text-slate-200">
                    {highlight.approach.fullName}
                    {highlight.namedBody && (
                      <span className="ml-1.5 rounded border border-amber-400/30 px-1 font-mono text-[7px] uppercase tracking-[0.1em] text-amber-200/90">
                        {t('katalogda', 'catalogued')}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 flex justify-between font-mono text-[8px] text-slate-500">
                    <span>{highlight.approach.closeApproachDate}</span>
                    <span>
                      {lunarDistanceLabel(highlight.approach.distanceAu)} · {highlight.approach.relativeVelocityKmS.toFixed(1)} km/s
                    </span>
                  </span>
                </button>
                <div className="flex flex-wrap gap-1 border-t border-white/5 px-2.5 py-1.5">
                  <button
                    type="button"
                    onClick={() => onShowApproach(highlight)}
                    className="rounded-md border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[8px] text-amber-100 hover:bg-amber-400/20"
                  >
                    {t('Simülasyonu bu tarihe al', 'Move simulation to this date')}
                  </button>
                  {highlight.namedBody?.bodyId && (
                    <button
                      type="button"
                      onClick={() => onFocusBody(highlight.namedBody!.bodyId!)}
                      className="rounded-md border border-cyan-400/25 bg-cyan-400/10 px-1.5 py-0.5 font-mono text-[8px] text-cyan-100 hover:bg-cyan-400/20"
                    >
                      {t('Sahnede göster', 'Show in scene')}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {selected && (
              <div className="rounded-lg border border-amber-400/25 bg-amber-400/5 p-2.5 font-mono text-[8px] text-slate-300">
                <div className="font-semibold text-amber-200">{selected.fullName}</div>
                <div className="mt-1 grid grid-cols-2 gap-1 text-slate-400">
                  <span>{t('Nominal', 'Nominal')}: {distanceLabel(selected.distanceAu)}</span>
                  <span>{t('Ay uzaklığı', 'Lunar distance')}: {lunarDistanceLabel(selected.distanceAu)}</span>
                  <span>{t('Çap', 'Diameter')}: {selected.diameterKm === null ? t('Bilinmiyor', 'Unknown') : `${selected.diameterKm.toFixed(3)} km`}</span>
                  <span>{t('Min', 'Min')}: {selected.minimumDistanceAu === null ? '—' : distanceLabel(selected.minimumDistanceAu)}</span>
                  <span>{t('Maks', 'Max')}: {selected.maximumDistanceAu === null ? '—' : distanceLabel(selected.maximumDistanceAu)}</span>
                </div>
                <a href={JPL_CAD_SOURCE_URL} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-amber-300">
                  {t('JPL CAD kaynağı', 'JPL CAD source')} ↗
                </a>
              </div>
            )}
          </div>
        )}

        {tab === 'catalog' && (
          <div className="space-y-1.5">
            {NAMED_SMALL_BODIES.map((body) => (
              <div
                key={body.id}
                className="rounded-lg border border-white/7 bg-white/[0.03] p-2.5"
              >
                <span className="font-mono text-[10px] font-semibold text-amber-100">
                  {language === 'tr' ? body.nameTr : body.name}
                </span>
                <span className="ml-2 font-mono text-[7px] uppercase text-slate-500">{body.kind}</span>
                <p className="mt-1 text-[9px] leading-relaxed text-slate-400">
                  {body.summaryTr}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <a
                    href={body.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[8px] uppercase tracking-[0.14em] text-amber-300/80 hover:text-amber-200"
                  >
                    {t('JPL SBDB', 'JPL SBDB')} ↗
                  </a>
                  {body.bodyId && (
                    <button
                      type="button"
                      onClick={() => onFocusBody(body.bodyId!)}
                      className="font-mono text-[8px] uppercase tracking-[0.14em] text-cyan-300/85 hover:text-cyan-200"
                    >
                      {t('Sahnede göster', 'Show in scene')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'comets' && (
          <div className="space-y-1.5">
            {COMETS.map((comet) => (
              <div key={comet.id} className="rounded-lg border border-white/7 bg-white/[0.03] p-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-[10px] font-semibold text-sky-100">
                    {comet.designation}
                  </span>
                  <span className="font-mono text-[8px] text-slate-500">
                    {comet.periodYears.toFixed(2)} {t('yıl', 'yr')}
                  </span>
                </div>
                <p className="mt-1 text-[9px] leading-relaxed text-slate-400">
                  {language === 'tr' ? comet.summaryTr : comet.summaryEn}
                </p>
                <div className="mt-1.5 grid grid-cols-2 gap-1 font-mono text-[8px] text-slate-400">
                  <span>{t('Günberi', 'Perihelion')}: {comet.perihelionAu.toFixed(3)} AU</span>
                  <span>{t('Günöte', 'Aphelion')}: {comet.aphelionAu.toFixed(2)} AU</span>
                  <span>{t('Dışmerkezlik', 'Eccentricity')}: {comet.eccentricity.toFixed(3)}</span>
                  <span>{t('Eğiklik', 'Inclination')}: {comet.inclinationDeg.toFixed(1)}°</span>
                </div>
                <p className="mt-1.5 rounded-md border border-amber-400/20 bg-amber-400/5 px-1.5 py-1 font-mono text-[8px] leading-relaxed text-amber-200/85">
                  {t(
                    `${comet.solutionEpoch} çözümünden iki-cisim uzatması; ${COMET_DRIFT_REFERENCE_DATE} tarihinde JPL Horizons'tan ${comet.horizonsDriftAu.toFixed(3)} AU sapıyor.`,
                    `Two-body extension of the ${comet.solutionEpoch} solution; it deviates ${comet.horizonsDriftAu.toFixed(3)} au from JPL Horizons on ${COMET_DRIFT_REFERENCE_DATE}.`,
                  )}
                </p>
                <a
                  href={comet.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex font-mono text-[8px] uppercase tracking-[0.14em] text-sky-300/85 hover:text-sky-200"
                >
                  {t('JPL SBDB', 'JPL SBDB')} ↗
                </a>
              </div>
            ))}
          </div>
        )}

        {tab === 'missions' && (
          <div className="space-y-1.5">
            {DEEP_SPACE_PROBES.map((probe) => (
              <a
                key={probe.id}
                href={probe.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-white/7 bg-white/[0.03] p-2.5 hover:border-cyan-400/25"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold text-cyan-100">
                    {probe.emoji} {language === 'tr' ? probe.nameTr : probe.name}
                  </span>
                  <span className="font-mono text-[7px] text-slate-500">{probe.launchYear}</span>
                </div>
                <p className="mt-1 text-[9px] text-slate-300">{probe.statusTr}</p>
                <p className="mt-1 font-mono text-[7px] leading-relaxed text-slate-500">
                  {probe.ephemerisNoteTr}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
