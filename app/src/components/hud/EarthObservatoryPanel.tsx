import { EARTH_DATA_URLS, type EarthEvent } from '@/lib/earth-observatory'
import type { EarthObservatoryState } from '@/hooks/useEarthObservatory'

interface EarthObservatoryPanelProps extends EarthObservatoryState {
  onClose: () => void
  onRefresh: () => void
  onSelectEvent: (event: EarthEvent) => void
}

const SOURCE_NAMES = {
  eonet: 'NASA EONET',
  usgs: 'USGS Deprem',
  aurora: 'NOAA SWPC',
} as const

function formatEventTime(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function EarthObservatoryPanel({
  status,
  events,
  aurora,
  errors,
  updatedAt,
  onClose,
  onRefresh,
  onSelectEvent,
}: EarthObservatoryPanelProps) {
  return (
    <section
      data-hud-surface
      aria-label="Dünya Gözlemevi"
      className="pointer-events-auto w-[350px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-emerald-400/25 bg-[#08110f]/92 shadow-[0_0_36px_rgba(16,185,129,0.12)] backdrop-blur-2xl"
    >
      <header className="flex items-start justify-between border-b border-white/10 px-3.5 py-3">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-emerald-300/70">
            Live Earth Intelligence
          </div>
          <h2 className="mt-0.5 font-mono text-sm font-bold tracking-[0.12em] text-emerald-100">
            DÜNYA GÖZLEMEVİ
          </h2>
          <p className="mt-1 font-mono text-[8px] text-slate-500">
            NASA · NOAA · USGS
            {updatedAt ? ` · ${new Date(updatedAt).toLocaleTimeString('tr-TR')}` : ''}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onRefresh}
            disabled={status === 'loading'}
            aria-label="Dünya verilerini yenile"
            className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 font-mono text-[10px] text-emerald-200 disabled:opacity-40"
          >
            ↻
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dünya Gözlemevini kapat"
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="max-h-[44vh] space-y-2.5 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-white/10">
        {status === 'loading' && (
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 font-mono text-[10px] text-emerald-200">
            Canlı Dünya akışları alınıyor…
          </div>
        )}

        {Object.entries(errors).map(([source, message]) => (
          <details
            key={source}
            className="rounded-lg border border-amber-400/25 bg-amber-400/5 px-2.5 py-2 font-mono text-[9px] text-amber-100"
          >
            <summary className="cursor-pointer">
              {SOURCE_NAMES[source as keyof typeof SOURCE_NAMES]} verisi alınamadı
            </summary>
            <p className="mt-1 break-words text-[8px] leading-relaxed text-amber-200/70">
              {message}
            </p>
          </details>
        ))}

        {aurora && (
          <div className="rounded-xl border border-violet-400/25 bg-violet-400/5 p-2.5">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-violet-300">
              NOAA Aurora Tahmini
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
            <span>Aktif olaylar ve M4.5+ depremler</span>
            <span>{events.length}</span>
          </div>
          <div className="space-y-1">
            {events.slice(0, 12).map((event) => (
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
                      <span>{formatEventTime(event.occurredAt)}</span>
                    </span>
                  </span>
                </div>
              </button>
            ))}
            {status !== 'loading' && events.length === 0 && (
              <p className="rounded-lg border border-white/7 bg-white/[0.025] p-2.5 font-mono text-[9px] text-slate-500">
                Gösterilecek geçerli olay bulunamadı.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <a
            href={EARTH_DATA_URLS.worldview}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-sky-400/20 bg-sky-400/5 px-2.5 py-2 font-mono text-[9px] text-sky-200 hover:bg-sky-400/10"
          >
            🛰 NASA Worldview
            <span className="mt-1 block text-[7px] text-slate-500">Günlük VIIRS görüntüsü</span>
          </a>
          <a
            href={EARTH_DATA_URLS.gibs}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-sky-400/20 bg-sky-400/5 px-2.5 py-2 font-mono text-[9px] text-sky-200 hover:bg-sky-400/10"
          >
            ◫ NASA GIBS
            <span className="mt-1 block text-[7px] text-slate-500">Katman/API kaynağı</span>
          </a>
        </div>
      </div>
    </section>
  )
}
