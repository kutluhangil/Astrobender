import { useEffect, useMemo, useState } from 'react'
import type { SkyEvent, SkyEventKind, SkyEventVisibility, SkyObserver } from '@/lib/sky-events'
import { directionLabel, getPerseidWatch, type PerseidWatch } from '@/lib/perseid-watch'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface SkywatchPanelProps {
  events: SkyEvent[]
  observer: SkyObserver | null
  locationError: string | null
  calculatedAt: number
  language: UiLanguage
  onRequestBrowserLocation: () => void
  onSaveManualLocation: (latitude: number, longitude: number, label: string) => boolean
  onClearLocation: () => void
  onSelectEvent: (event: SkyEvent) => void
  onStartPerseidSimulation: (watch: PerseidWatch) => void
  onClose: () => void
}

const EVENT_STYLE: Record<SkyEventKind, { glyph: string; accent: string; panel: string }> = {
  'solar-eclipse': { glyph: '☼', accent: 'text-amber-200', panel: 'border-amber-300/25 bg-amber-300/[0.045]' },
  'lunar-eclipse': { glyph: '◐', accent: 'text-violet-200', panel: 'border-violet-300/25 bg-violet-300/[0.045]' },
  'meteor-shower': { glyph: '✦', accent: 'text-slate-100', panel: 'border-slate-300/20 bg-slate-300/[0.035]' },
  'maximum-elongation': { glyph: '◌', accent: 'text-cyan-200', panel: 'border-cyan-300/25 bg-cyan-300/[0.045]' },
  conjunction: { glyph: '⊙', accent: 'text-cyan-200', panel: 'border-cyan-300/25 bg-cyan-300/[0.045]' },
  opposition: { glyph: '◍', accent: 'text-sky-200', panel: 'border-sky-300/25 bg-sky-300/[0.045]' },
}

function monthKey(value: string): string {
  return value.slice(0, 7)
}

function formatMonth(key: string, language: UiLanguage): string {
  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${key}-01T12:00:00Z`))
}

function formatEventTime(value: string, language: UiLanguage): string {
  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(value))
}

function formatCountdown(startsAt: string, now: number, language: UiLanguage): string {
  const differenceMs = new Date(startsAt).getTime() - now
  const differenceMinutes = Math.round(differenceMs / 60_000)
  if (differenceMinutes <= 0) return pickLanguage(language, 'Başladı', 'In progress')
  const days = Math.floor(differenceMinutes / (60 * 24))
  const hours = Math.floor((differenceMinutes % (60 * 24)) / 60)
  if (days > 0) return pickLanguage(language, `${days} gün ${hours} sa`, `${days}d ${hours}h`)
  return pickLanguage(language, `${Math.max(1, hours)} sa`, `${Math.max(1, hours)}h`)
}

function visibilityLabel(visibility: SkyEventVisibility, language: UiLanguage): string {
  const labels: Record<SkyEventVisibility, [string, string]> = {
    global: ['Küresel olay', 'Global event'],
    'local-visible': ['Seçili konumda görünür', 'Visible at selected location'],
    'local-not-visible': ['Seçili konumda görünmüyor', 'Not visible at selected location'],
    'location-required': ['Yerel görünürlük için konum seçin', 'Choose a location for local visibility'],
  }
  return labels[visibility][language === 'tr' ? 0 : 1]
}

function formatUtcRange(start: string, end: string, language: UiLanguage): string {
  const formatter = new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  })
  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`
}

function perseidStatusLabel(status: PerseidWatch['status'], language: UiLanguage): string {
  const labels: Record<PerseidWatch['status'], [string, string]> = {
    upcoming: ['Yaklaşıyor', 'Upcoming'],
    active: ['Aktif', 'Active'],
    peak: ['Zirve şimdi', 'Peak now'],
    completed: ['Sezon tamamlandı', 'Season complete'],
  }
  return labels[status][language === 'tr' ? 0 : 1]
}

function scoreLabel(score: number, language: UiLanguage): string {
  if (score >= 80) return pickLanguage(language, 'Çok uygun', 'Very favorable')
  if (score >= 55) return pickLanguage(language, 'Uygun', 'Favorable')
  if (score >= 25) return pickLanguage(language, 'Sınırlı', 'Limited')
  return pickLanguage(language, 'Şu an uygun değil', 'Not favorable now')
}

function PerseidWatchCard({ watch, language, onStartSimulation }: {
  watch: PerseidWatch
  language: UiLanguage
  onStartSimulation: (watch: PerseidWatch) => void
}) {
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const observer = watch.observer

  return (
    <section className="relative overflow-hidden rounded-xl border border-amber-200/30 bg-amber-200/[0.055] p-2.5 shadow-[0_0_22px_rgba(251,191,36,0.08)]" aria-label="Perseid Watch">
      <div aria-hidden="true" className="perseid-card-streams">
        <span className="perseid-card-stream perseid-card-stream--one" />
        <span className="perseid-card-stream perseid-card-stream--two" />
      </div>
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-amber-100/75">Perseid Watch · 2026</div>
            <h3 className="mt-0.5 font-mono text-xs font-bold tracking-[0.1em] text-amber-50">{t('PERSEİD AKIŞI', 'PERSEID STREAM')}</h3>
          </div>
          <span className="rounded-full border border-amber-100/25 bg-black/20 px-1.5 py-0.5 font-mono text-[8px] font-semibold text-amber-100">{perseidStatusLabel(watch.status, language)}</span>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-[8px]">
          <div className="rounded border border-white/10 bg-black/15 px-2 py-1.5 text-amber-50/90">
            <div className="text-amber-100/55">{t('AKTİF', 'ACTIVE')}</div>
            <div className="mt-0.5">17 Tem – 24 Ağu</div>
          </div>
          <div className="rounded border border-white/10 bg-black/15 px-2 py-1.5 text-amber-50/90">
            <div className="text-amber-100/55">{t('ZİRVE', 'PEAK')}</div>
            <div className="mt-0.5">{formatUtcRange(watch.peakStart, watch.peakEnd, language)}</div>
          </div>
          <div className="rounded border border-white/10 bg-black/15 px-2 py-1.5 text-amber-50/90">
            <div className="text-amber-100/55">{t('AY IŞIĞI', 'MOONLIGHT')}</div>
            <div className="mt-0.5">{language === 'tr' ? `%${watch.moonIlluminationPercent}` : `${watch.moonIlluminationPercent}%`}</div>
          </div>
          <div className="rounded border border-white/10 bg-black/15 px-2 py-1.5 text-amber-50/90">
            <div className="text-amber-100/55">ZHR</div>
            <div className="mt-0.5">{watch.zhr}</div>
          </div>
        </div>

        {observer ? (
          <div className="mt-2 rounded-lg border border-amber-100/15 bg-black/20 px-2 py-1.5">
            <div className="flex items-center justify-between gap-2 font-mono text-[8px]">
              <span className="text-amber-100/65">{observer.label} · {t('şimdi', 'now')}</span>
              <span className="font-semibold text-amber-50">{scoreLabel(observer.astronomicalScore, language)} · {observer.astronomicalScore}/100</span>
            </div>
            <p className="mt-1 text-[9px] leading-relaxed text-slate-200">
              {t('Işınım', 'Radiant')}: {directionLabel(observer.radiantAzimuthDegrees, language)} · {Math.round(observer.radiantAltitudeDegrees)}° · {t('Güneş', 'Sun')}: {Math.round(observer.sunAltitudeDegrees)}°
            </p>
            <p className="mt-1 font-mono text-[7px] leading-relaxed text-amber-100/60">{t('Astronomik skor; bulutluluk ve yerel engeller dahil değildir.', 'Astronomical score; cloud cover and local obstructions are excluded.')}</p>
          </div>
        ) : (
          <p className="mt-2 rounded-lg border border-amber-100/15 bg-black/20 px-2 py-1.5 text-[9px] leading-relaxed text-slate-300">{t('Işınımın yönü, yüksekliği ve astronomik gözlem skoru için konum seçin.', 'Choose a location for radiant direction, altitude, and an astronomical viewing score.')}</p>
        )}

        <p className="mt-2 text-[8px] leading-relaxed text-slate-300">{watch.parentBody} · {t('Hedef: geniş gökyüzü, karanlık ufuk ve ışınımdan uzağa bakış.', 'Aim for a wide sky, a dark horizon, and a view away from the radiant.')}</p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[8px]">
          <a href={watch.sourceUrl} target="_blank" rel="noreferrer" className="text-amber-100 hover:text-amber-50">IMO {t('takvimi', 'calendar')} ↗</a>
          <a href={watch.reportUrl} target="_blank" rel="noreferrer" className="text-amber-100 hover:text-amber-50">{t('Gözlem bildir', 'Report observation')} ↗</a>
          <a href={watch.fireballUrl} target="_blank" rel="noreferrer" className="text-amber-100 hover:text-amber-50">{t('Ateştopu bildir', 'Report fireball')} ↗</a>
        </div>
        <button type="button" onClick={() => onStartSimulation(watch)} className="mt-2 w-full rounded-md border border-amber-100/35 bg-amber-200/[0.08] px-2 py-1.5 font-mono text-[9px] font-semibold text-amber-50 transition-colors hover:bg-amber-200/[0.16]">
          {t('Görsel akışı simülasyonda göster', 'Show visual stream in simulation')}
        </button>
      </div>
    </section>
  )
}

function SkywatchLocationControl({
  observer,
  locationError,
  language,
  onRequestBrowserLocation,
  onSaveManualLocation,
  onClearLocation,
}: Pick<SkywatchPanelProps, 'observer' | 'locationError' | 'language' | 'onRequestBrowserLocation' | 'onSaveManualLocation' | 'onClearLocation'>) {
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [label, setLabel] = useState('')

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSaveManualLocation(Number(latitude), Number(longitude), label)
  }

  return (
    <section className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.035] p-2.5" aria-label={t('Gözlem konumu', 'Observer location')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[8px] font-semibold uppercase tracking-[0.17em] text-cyan-200/80">
            {t('Gözlem konumu', 'Observer location')}
          </div>
          <p className="mt-1 text-[9px] leading-relaxed text-slate-400">
            {observer
              ? `${observer.label} · ${observer.latitude.toFixed(3)}°, ${observer.longitude.toFixed(3)}°`
              : t('Yerel görünürlük için konum seçin.', 'Choose a location for local visibility.')}
          </p>
        </div>
        {observer && (
          <button
            type="button"
            onClick={onClearLocation}
            className="shrink-0 rounded border border-white/15 px-1.5 py-1 font-mono text-[8px] text-slate-400 hover:border-white/30 hover:text-slate-200"
          >
            {t('Temizle', 'Clear')}
          </button>
        )}
      </div>

      {!observer && (
        <>
          <button
            type="button"
            onClick={onRequestBrowserLocation}
            className="mt-2 w-full rounded-lg border border-cyan-300/25 bg-cyan-300/[0.07] px-2 py-1.5 font-mono text-[9px] font-semibold text-cyan-100 transition-colors hover:bg-cyan-300/[0.13]"
          >
            ◉ {t('Tarayıcı konumunu kullan', 'Use browser location')}
          </button>
          <details className="mt-1.5 group">
            <summary className="cursor-pointer font-mono text-[8px] text-slate-500 hover:text-slate-300">
              {t('Koordinatları elle gir', 'Enter coordinates manually')}
            </summary>
            <form className="mt-2 grid grid-cols-2 gap-1.5" onSubmit={submit}>
              <label className="font-mono text-[8px] text-slate-500">
                {t('Enlem', 'Latitude')}
                <input aria-label={t('Enlem', 'Latitude')} value={latitude} onChange={(event) => setLatitude(event.currentTarget.value)} inputMode="decimal" className="mt-1 w-full rounded border border-white/10 bg-black/25 px-2 py-1.5 text-[10px] text-slate-100 outline-none focus:border-cyan-300/60" />
              </label>
              <label className="font-mono text-[8px] text-slate-500">
                {t('Boylam', 'Longitude')}
                <input aria-label={t('Boylam', 'Longitude')} value={longitude} onChange={(event) => setLongitude(event.currentTarget.value)} inputMode="decimal" className="mt-1 w-full rounded border border-white/10 bg-black/25 px-2 py-1.5 text-[10px] text-slate-100 outline-none focus:border-cyan-300/60" />
              </label>
              <label className="col-span-2 font-mono text-[8px] text-slate-500">
                {t('Konum etiketi', 'Location label')}
                <input aria-label={t('Konum etiketi', 'Location label')} value={label} onChange={(event) => setLabel(event.currentTarget.value)} className="mt-1 w-full rounded border border-white/10 bg-black/25 px-2 py-1.5 text-[10px] text-slate-100 outline-none focus:border-cyan-300/60" />
              </label>
              <button type="submit" className="col-span-2 rounded border border-cyan-300/30 px-2 py-1.5 font-mono text-[9px] text-cyan-100 hover:bg-cyan-300/10">
                {t('Konumu kaydet', 'Save location')}
              </button>
            </form>
          </details>
        </>
      )}

      {locationError && (
        <p role="alert" className="mt-2 rounded border border-amber-300/25 bg-amber-300/[0.06] px-2 py-1.5 font-mono text-[8px] leading-relaxed text-amber-100">
          {locationError}
        </p>
      )}
    </section>
  )
}

export default function SkywatchPanel({
  events,
  observer,
  locationError,
  calculatedAt,
  language,
  onRequestBrowserLocation,
  onSaveManualLocation,
  onClearLocation,
  onSelectEvent,
  onStartPerseidSimulation,
  onClose,
}: SkywatchPanelProps) {
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const [now, setNow] = useState(() => Date.now())
  const perseidWatch = getPerseidWatch(new Date(now), observer ?? undefined)
  const months = useMemo(() => [...new Set(events.map((event) => monthKey(event.startsAt)))], [events])
  const [requestedMonth, setRequestedMonth] = useState(() => months[0] ?? '')
  const selectedMonth = months.includes(requestedMonth) ? requestedMonth : (months[0] ?? '')

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const selectedIndex = months.indexOf(selectedMonth)
  const displayedEvents = events.filter((event) => monthKey(event.startsAt) === selectedMonth)
  const nextEvent = events.find((event) => new Date(event.startsAt).getTime() > now)?.id

  return (
    <section
      data-hud-surface
      aria-label={t('Gökyüzü Takvimi', 'Skywatch Calendar')}
      className="pointer-events-auto w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#071018]/95 shadow-[0_0_44px_rgba(34,211,238,0.12)] backdrop-blur-2xl"
    >
      <header className="border-b border-white/10 px-3.5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[8px] font-semibold uppercase tracking-[0.22em] text-cyan-200/70">
              {t('Canlı astronomi rehberi', 'Live astronomy guide')}
            </div>
            <h2 className="mt-0.5 font-mono text-sm font-bold tracking-[0.13em] text-cyan-50">
              {t('GÖKYÜZÜ TAKVİMİ', 'SKYWATCH CALENDAR')}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t('Gökyüzü Takvimini kapat', 'Close Skywatch Calendar')} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/10">
            ✕
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg border border-white/8 bg-black/20 px-2 py-1.5">
          <button type="button" disabled={selectedIndex <= 0} onClick={() => setRequestedMonth(months[selectedIndex - 1])} aria-label={t('Önceki ay', 'Previous month')} className="px-1.5 text-sm text-cyan-200 disabled:opacity-25">‹</button>
          <div className="text-center">
            <div className="font-mono text-[10px] font-semibold capitalize text-slate-100">{selectedMonth ? formatMonth(selectedMonth, language) : t('Olay yok', 'No events')}</div>
            <div className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-slate-500">{displayedEvents.length} {t('olay', 'events')} · {new Date(calculatedAt).toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US')}</div>
          </div>
          <button type="button" disabled={selectedIndex < 0 || selectedIndex >= months.length - 1} onClick={() => setRequestedMonth(months[selectedIndex + 1])} aria-label={t('Sonraki ay', 'Next month')} className="px-1.5 text-sm text-cyan-200 disabled:opacity-25">›</button>
        </div>
      </header>

      <div className="max-h-[52vh] space-y-2.5 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-white/10">
        <SkywatchLocationControl
          observer={observer}
          locationError={locationError}
          language={language}
          onRequestBrowserLocation={onRequestBrowserLocation}
          onSaveManualLocation={onSaveManualLocation}
          onClearLocation={onClearLocation}
        />

        {perseidWatch && (
          <PerseidWatchCard
            watch={perseidWatch}
            language={language}
            onStartSimulation={onStartPerseidSimulation}
          />
        )}

        {displayedEvents.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.025] p-3 font-mono text-[9px] leading-relaxed text-slate-400">
            {t('Bu hesaplama penceresinde gösterilecek bir olay yok.', 'There are no events in this calculation window.')}
          </p>
        ) : (
          <ol className="space-y-2">
            {displayedEvents.map((event) => {
              const style = EVENT_STYLE[event.kind]
              const isNext = event.id === nextEvent
              return (
                <li key={event.id} className={`relative overflow-hidden rounded-xl border p-2.5 ${style.panel}${isNext ? ' skywatch-event--next' : ''}`}>
                  <div className="absolute bottom-0 left-0 top-0 w-px bg-white/20" />
                  <div className="flex items-start gap-2.5">
                    <span aria-hidden="true" className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/20 bg-black/15 text-sm ${style.accent}`}>{style.glyph}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[10px] font-semibold leading-snug text-slate-100">{event.title}</h3>
                        <span className={`shrink-0 font-mono text-[8px] font-semibold ${style.accent}`}>{formatCountdown(event.startsAt, now, language)}</span>
                      </div>
                      <p className="mt-1 font-mono text-[8px] text-slate-400">{formatEventTime(event.startsAt, language)}</p>
                      <p className="mt-1.5 text-[9px] leading-relaxed text-slate-300">{event.summary}</p>
                      <p className="mt-1 text-[8px] leading-relaxed text-slate-500">{event.guidance}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-slate-500">{visibilityLabel(event.visibility, language)}</span>
                        <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="font-mono text-[8px] text-cyan-200 hover:text-cyan-100">{t('Kaynak', 'Source')} ↗</a>
                      </div>
                      <button type="button" onClick={() => onSelectEvent(event)} className="mt-2 w-full rounded-md border border-cyan-300/25 bg-cyan-300/[0.06] px-2 py-1.5 font-mono text-[9px] font-semibold text-cyan-100 transition-colors hover:bg-cyan-300/[0.13]">
                        {t('Simülasyonda göster', 'Show in simulation')}
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
