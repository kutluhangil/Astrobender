import { useState, type FocusEvent } from 'react'
import type { SimClock } from '@/hooks/useSimClock'

const SPEEDS = [-240, -60, -10, 10, 60, 240]

export interface SystemStatusNotice {
  id: string
  title: string
  summary: string
  technicalDetails?: string
  retryLabel?: string
  onRetry?: () => void
}

interface TimeControllerProps {
  clock: SimClock
  notices?: SystemStatusNotice[]
  language?: 'tr' | 'en'
}

export default function TimeController({ clock, notices = [], language = 'tr' }: TimeControllerProps) {
  const [infoOpen, setInfoOpen] = useState(false)
  const live = clock.playing && clock.speed === 1
  const hasNotices = notices.length > 0
  const t = (tr: string, en: string) => language === 'tr' ? tr : en

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setInfoOpen(false)
  }

  return (
    <div data-hud-surface className="pointer-events-auto flex items-center gap-0.5 overflow-visible rounded-full border border-white/10 bg-[#0a0e14]/75 p-1 md:p-1.5 backdrop-blur-xl">
      {SPEEDS.map((s) => {
        const active = clock.playing && clock.speed === s
        return (
          <button
            key={s}
            onClick={() => clock.setSpeed(s)}
            className={`min-w-[38px] md:min-w-[44px] rounded-full px-1.5 md:px-2 py-1.5 font-mono text-[10px] md:text-[11px] tabular-nums transition-colors ${
              active
                ? 'bg-sky-400/25 text-sky-200'
                : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            {s > 0 ? `+${s}×` : `${s}×`}
          </button>
        )
      })}
      <button
        onClick={() => (clock.playing ? clock.pause() : clock.resume())}
        title={clock.playing ? 'Pause' : 'Resume'}
        className="ml-0.5 md:ml-1 flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full text-slate-300 hover:bg-white/10"
      >
        {clock.playing ? (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 md:h-3 md:w-3 fill-current">
            <rect x="1.5" y="1" width="3.2" height="10" rx="0.6" />
            <rect x="7.3" y="1" width="3.2" height="10" rx="0.6" />
          </svg>
        ) : (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 md:h-3 md:w-3 fill-current">
            <path d="M3 1.4v9.2c0 .8.9 1.3 1.6.9l7-4.6c.6-.4.6-1.4 0-1.8l-7-4.6c-.7-.4-1.6.1-1.6.9z" />
          </svg>
        )}
      </button>
      <button
        onClick={() => clock.goNow()}
        className={`ml-0.5 md:ml-1 flex items-center gap-1 md:gap-1.5 rounded-full px-2.5 md:px-3.5 py-1.5 font-mono text-[10px] md:text-[11px] tracking-wider transition-colors ${
          live
            ? 'bg-emerald-400 text-emerald-950'
            : 'border border-emerald-400/50 text-emerald-300 hover:bg-emerald-400/10'
        }`}
      >
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            live ? 'bg-emerald-900' : 'bg-emerald-400'
          }`}
        />
        LIVE
      </button>

      <div
        className="relative ml-0.5 md:ml-1"
        onMouseEnter={() => setInfoOpen(true)}
        onMouseLeave={() => setInfoOpen(false)}
        onFocusCapture={() => setInfoOpen(true)}
        onBlur={handleBlur}
      >
        <button
          type="button"
          onClick={() => setInfoOpen((current) => !current)}
          aria-expanded={infoOpen}
          aria-controls="system-status-panel"
          aria-label={t('Sistem veri durumunu göster', 'Show system data status')}
          className={`relative flex h-7 w-7 items-center justify-center rounded-full border font-mono text-[11px] font-bold transition-colors md:h-8 md:w-8 ${
            hasNotices
              ? 'border-amber-300/60 bg-amber-300/10 text-amber-200 hover:bg-amber-300/20'
              : 'border-white/15 text-slate-400 hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-cyan-100'
          }`}
        >
          i
          {hasNotices && (
            <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.9)]" />
          )}
        </button>

        {infoOpen && (
          <section
            id="system-status-panel"
            role="status"
            aria-live="polite"
            className="absolute bottom-full right-0 z-40 mb-2 w-[min(320px,calc(100vw-24px))] rounded-xl border border-cyan-300/20 bg-[#091017]/95 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.72)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
              <div>
                <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                  {t('Sistem Durumu', 'System Status')}
                </div>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {hasNotices
                    ? t('Canlı kaynaklardan biri güncellenemedi.', 'A live source could not be refreshed.')
                    : t('Tüm etkin veri kanalları normal çalışıyor.', 'All active data channels are operating normally.')}
                </p>
              </div>
              <span className={`h-2 w-2 shrink-0 rounded-full ${hasNotices ? 'bg-amber-300' : 'bg-emerald-400'}`} />
            </div>

            {hasNotices ? (
              <div className="mt-2 space-y-2">
                {notices.map((notice) => (
                  <article key={notice.id} className="rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-2">
                    <div className="font-medium text-[11px] text-amber-100">{notice.title}</div>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-amber-100/70">{notice.summary}</p>
                    {notice.technicalDetails && (
                      <details className="mt-1.5">
                        <summary className="w-fit cursor-pointer font-mono text-[9px] text-amber-200/90">
                          {t('Teknik ayrıntı', 'Technical details')}
                        </summary>
                        <p className="mt-1 break-words font-mono text-[8.5px] leading-relaxed text-amber-100/60">
                          {notice.technicalDetails}
                        </p>
                      </details>
                    )}
                    {notice.onRetry && (
                      <button
                        type="button"
                        onClick={notice.onRetry}
                        className="mt-2 rounded border border-amber-300/30 px-2 py-1 font-mono text-[9px] text-amber-200 transition-colors hover:bg-amber-300/10"
                      >
                        {notice.retryLabel ?? t('Tekrar dene', 'Retry')}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-2 font-mono text-[9px] leading-relaxed text-slate-400">
                {t('Canlı saat, kataloglar ve görünür katmanlar izleniyor.', 'Live time, catalogs, and visible layers are being monitored.')}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
