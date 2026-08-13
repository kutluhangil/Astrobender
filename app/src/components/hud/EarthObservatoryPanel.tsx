import { useState } from 'react'
import {
  EARTH_DATA_URLS,
  getEarthSourceEvidence,
  type EarthEvent,
  type EarthLayerVisibility,
  type EarthSourceId,
} from '@/lib/earth-observatory'
import type { EarthObservatoryState } from '@/hooks/useEarthObservatory'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'
import EvidenceMark from './EvidenceMark'

interface EarthObservatoryPanelProps extends EarthObservatoryState {
  onClose: () => void
  onRefresh: () => void
  onSelectEvent: (event: EarthEvent) => void
  layerVisibility: EarthLayerVisibility
  onToggleLayer: (source: EarthSourceId) => void
  language?: UiLanguage
}

const SOURCE_NAMES = {
  eonet: { tr: 'NASA EONET', en: 'NASA EONET' },
  usgs: { tr: 'USGS Deprem', en: 'USGS Earthquakes' },
  aurora: { tr: 'NOAA Aurora', en: 'NOAA Aurora' },
  cache: { tr: 'Yerel önbellek', en: 'Local cache' },
} as const

function formatEventTime(value: string, language: UiLanguage): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatAge(value: number, language: UiLanguage): string {
  const ageMinutes = Math.max(0, Math.round((Date.now() - value) / 60_000))
  if (ageMinutes < 1) return pickLanguage(language, 'şimdi', 'just now')
  if (ageMinutes < 60) return pickLanguage(language, `${ageMinutes} dk önce`, `${ageMinutes}m ago`)
  const hours = Math.round(ageMinutes / 60)
  return pickLanguage(language, `${hours} sa önce`, `${hours}h ago`)
}

export default function EarthObservatoryPanel({
  status,
  events,
  aurora,
  errors,
  updatedAt,
  cachedSources,
  sourceUpdatedAt,
  onClose,
  onRefresh,
  onSelectEvent,
  layerVisibility,
  onToggleLayer,
  language = 'tr',
}: EarthObservatoryPanelProps) {
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const [imageryDate, setImageryDate] = useState(() => new Date().toISOString().slice(0, 10))
  const worldviewUrl = `${EARTH_DATA_URLS.worldview}&t=${imageryDate}`
  return (
    <section
      data-hud-surface
      aria-label={t('Dünya Gözlemevi', 'Earth Observatory')}
      className="pointer-events-auto w-[350px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-emerald-400/25 bg-[#08110f]/92 shadow-[0_0_36px_rgba(16,185,129,0.12)] backdrop-blur-2xl"
    >
      <header className="flex items-start justify-between border-b border-white/10 px-3.5 py-3">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-emerald-300/70">
            {t('Canlı Dünya İstihbaratı', 'Live Earth Intelligence')}
          </div>
          <h2 className="mt-0.5 font-mono text-sm font-bold tracking-[0.12em] text-emerald-100">
            {t('DÜNYA GÖZLEMEVİ', 'EARTH OBSERVATORY')}
          </h2>
          <p className="mt-1 font-mono text-[8px] text-slate-500">
            NASA · NOAA · USGS
            {updatedAt ? ` · ${new Date(updatedAt).toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US')}` : ''}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onRefresh}
            disabled={status === 'loading'}
            aria-label={t('Dünya verilerini yenile', 'Refresh Earth data')}
            className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 font-mono text-[10px] text-emerald-200 disabled:opacity-40"
          >
            ↻
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Dünya Gözlemevini kapat', 'Close Earth Observatory')}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="max-h-[44vh] space-y-2.5 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-white/10">
        {status === 'loading' && (
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 font-mono text-[10px] text-emerald-200">
            {t('Canlı Dünya akışları alınıyor…', 'Loading live Earth feeds…')}
          </div>
        )}

        {Object.entries(errors).map(([source, message]) => (
          <details
            key={source}
            className="rounded-lg border border-amber-400/25 bg-amber-400/5 px-2.5 py-2 font-mono text-[9px] text-amber-100"
          >
            <summary className="cursor-pointer">
              {SOURCE_NAMES[source as keyof typeof SOURCE_NAMES][language]} {t('verisi alınamadı', 'data unavailable')}
            </summary>
            <p className="mt-1 break-words text-[8px] leading-relaxed text-amber-200/70">
              {message}
            </p>
          </details>
        ))}

        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={t('Dünya veri katmanları', 'Earth data layers')}>
          {(['eonet', 'usgs', 'aurora'] as const).map((source) => (
            <button
              key={source}
              type="button"
              aria-pressed={layerVisibility[source]}
              onClick={() => onToggleLayer(source)}
              className={`rounded-lg border px-2 py-1.5 font-mono text-[8px] transition-colors ${
                layerVisibility[source]
                  ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100'
                  : 'border-white/10 bg-white/[0.03] text-slate-500'
              }`}
            >
              {SOURCE_NAMES[source][language]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5" aria-label={t('Dünya veri kanıtları', 'Earth data evidence')}>
          {(['eonet', 'usgs', 'aurora'] as const).map((source) => {
            const retrievedAt = sourceUpdatedAt[source]
            return retrievedAt ? (
              <EvidenceMark
                key={source}
                evidence={getEarthSourceEvidence(source, retrievedAt)}
                language={language}
                contextLabel={SOURCE_NAMES[source][language]}
              />
            ) : null
          })}
        </div>

        {cachedSources.length > 0 && (
          <div className="rounded-lg border border-sky-400/25 bg-sky-400/5 px-2.5 py-2 font-mono text-[8px] leading-relaxed text-sky-100">
            {t('Önbellekten gösteriliyor:', 'Showing cached data:')}{' '}
            {cachedSources
              .map((source) => {
                const fetchedAt = sourceUpdatedAt[source]
                return `${SOURCE_NAMES[source][language]}${fetchedAt ? ` (${formatAge(fetchedAt, language)})` : ''}`
              })
              .join(' · ')}
          </div>
        )}

        {aurora && layerVisibility.aurora && (
          <div className="rounded-xl border border-violet-400/25 bg-violet-400/5 p-2.5">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-violet-300">
              {t('NOAA Aurora Tahmini', 'NOAA Aurora Forecast')}
            </div>
            <div className="mt-1 flex items-end justify-between">
              <span className="font-mono text-xl font-bold text-violet-100">
                %{Math.round(aurora.maxProbability)}
              </span>
              <span className="font-mono text-[8px] text-slate-500">
                {aurora.lat.toFixed(1)}°, {aurora.lon.toFixed(1)}°
              </span>
            </div>
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">
            <span>{t('Aktif olaylar ve M4.5+ depremler', 'Active events and M4.5+ earthquakes')}</span>
            <span>{events.length}</span>
          </div>
          <div className="space-y-1">
            {events
              .filter((event) =>
                event.kind === 'earthquake' ? layerVisibility.usgs : layerVisibility.eonet,
              )
              .slice(0, 12)
              .map((event) => (
              <button
                type="button"
                key={event.id}
                onClick={() => onSelectEvent(event)}
                className="w-full rounded-lg border border-white/7 bg-white/[0.035] px-2.5 py-2 text-left transition-colors hover:border-emerald-400/30 hover:bg-emerald-400/8"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-[11px]">
                    {event.kind === 'earthquake' ? '◉' : '◆'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] font-medium text-slate-200">
                      {event.title}
                    </span>
                    <span className="mt-0.5 flex justify-between font-mono text-[8px] text-slate-500">
                      <span>{event.subtitle}</span>
                      <span>{formatEventTime(event.occurredAt, language)}</span>
                    </span>
                  </span>
                </div>
              </button>
              ))}
            {status !== 'loading' &&
              events.filter((event) =>
                event.kind === 'earthquake' ? layerVisibility.usgs : layerVisibility.eonet,
              ).length === 0 && (
              <p className="rounded-lg border border-white/7 bg-white/[0.025] p-2.5 font-mono text-[9px] text-slate-500">
                {t('Gösterilecek geçerli olay bulunamadı.', 'No valid events are available.')}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <a
            href={worldviewUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-sky-400/20 bg-sky-400/5 px-2.5 py-2 font-mono text-[9px] text-sky-200 hover:bg-sky-400/10"
          >
            🛰 NASA Worldview
            <span className="mt-1 block text-[7px] text-slate-500">{t('Günlük VIIRS görüntüsü', 'Daily VIIRS imagery')}</span>
          </a>
          <a
            href={EARTH_DATA_URLS.gibs}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-sky-400/20 bg-sky-400/5 px-2.5 py-2 font-mono text-[9px] text-sky-200 hover:bg-sky-400/10"
          >
            ◫ NASA GIBS
            <span className="mt-1 block text-[7px] text-slate-500">{t('Katman/API kaynağı', 'Layer/API source')}</span>
          </a>
        </div>
        <label className="block rounded-lg border border-sky-400/15 bg-sky-400/[0.03] px-2.5 py-2 font-mono text-[8px] text-sky-100/75">
          {t('NASA günlük görüntü tarihi', 'NASA daily imagery date')}
          <input
            type="date"
            value={imageryDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setImageryDate(event.currentTarget.value)}
            className="mt-1 block w-full rounded border border-white/10 bg-black/25 px-2 py-1 text-[9px] text-sky-100"
          />
        </label>
      </div>
    </section>
  )
}
