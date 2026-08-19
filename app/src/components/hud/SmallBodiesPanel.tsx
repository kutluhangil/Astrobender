import { useState } from 'react'
import {
  JPL_CAD_SOURCE_URL,
  NAMED_SMALL_BODIES,
  type CloseApproach,
} from '@/lib/jpl-small-bodies'
import { DEEP_SPACE_PROBES } from '@/lib/probes'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface SmallBodiesPanelProps {
  status: 'idle' | 'loading' | 'ready' | 'error'
  approaches: CloseApproach[]
  error: string | null
  updatedAt: number | null
  onClose: () => void
  onRefresh: () => void
  language?: UiLanguage
}

type PanelTab = 'approaches' | 'catalog' | 'missions'

function distanceLabel(distanceAu: number): string {
  return `${distanceAu.toFixed(4)} AU`
}

export default function SmallBodiesPanel({
  status,
  approaches,
  error,
  updatedAt,
  onClose,
  onRefresh,
  language = 'tr',
}: SmallBodiesPanelProps) {
  const [tab, setTab] = useState<PanelTab>('approaches')
  const [selected, setSelected] = useState<CloseApproach | null>(null)
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)

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

      <div className="grid grid-cols-3 border-b border-white/10 p-1">
        {([
          ['approaches', `${t('Yakın Geçiş', 'Approaches')} ${approaches.length}`],
          ['catalog', `${t('Katalog', 'Catalog')} 7`],
          ['missions', `${t('Görevler', 'Missions')} ${DEEP_SPACE_PROBES.length}`],
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
            {approaches.slice(0, 24).map((approach) => (
              <button
                type="button"
                key={`${approach.designation}-${approach.closeApproachDate}`}
                onClick={() => setSelected(approach)}
                className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
                  selected === approach
                    ? 'border-amber-400/50 bg-amber-400/12'
                    : 'border-white/7 bg-white/[0.03] hover:border-amber-400/25'
                }`}
              >
                <span className="block truncate text-[10px] font-medium text-slate-200">
                  {approach.fullName}
                </span>
                <span className="mt-1 flex justify-between font-mono text-[8px] text-slate-500">
                  <span>{approach.closeApproachDate}</span>
                  <span>{distanceLabel(approach.distanceAu)} · {approach.relativeVelocityKmS.toFixed(1)} km/s</span>
                </span>
              </button>
            ))}
            {selected && (
              <div className="rounded-lg border border-amber-400/25 bg-amber-400/5 p-2.5 font-mono text-[8px] text-slate-300">
                <div className="font-semibold text-amber-200">{selected.fullName}</div>
                <div className="mt-1 grid grid-cols-2 gap-1 text-slate-400">
                  <span>{t('Nominal', 'Nominal')}: {distanceLabel(selected.distanceAu)}</span>
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
              <a
                key={body.id}
                href={body.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-white/7 bg-white/[0.03] p-2.5 hover:border-amber-400/25"
              >
                <span className="font-mono text-[10px] font-semibold text-amber-100">
                  {language === 'tr' ? body.nameTr : body.name}
                </span>
                <span className="ml-2 font-mono text-[7px] uppercase text-slate-500">{body.kind}</span>
                <p className="mt-1 text-[9px] leading-relaxed text-slate-400">
                  {body.summaryTr}
                </p>
              </a>
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
