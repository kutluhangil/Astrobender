import { useMemo } from 'react'
import type { OmmElements } from '@/lib/omm'
import { compassPoint, predictPasses, type SatellitePass } from '@/lib/satellite-passes'
import type { SkyObserver } from '@/lib/sky-events'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

/** Element sets older than this give pass times off by minutes; they are not shown. */
const MAX_ELEMENT_AGE_DAYS = 14
/** Beyond this age the card still predicts but warns about timing drift. */
const WARN_ELEMENT_AGE_DAYS = 3
const SEARCH_HOURS = 72
const DAY_MS = 86_400_000

interface SatellitePassesCardProps {
  targets: OmmElements[]
  observer: SkyObserver | null
  /** Start of the search, rounded by the caller so the card does not recompute every render. */
  fromMs: number
  language: UiLanguage
  onShowPass: (norad: number, atMs: number) => void
}

function formatTime(date: Date, language: UiLanguage): string {
  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(date)
}

export default function SatellitePassesCard({ targets, observer, fromMs, language, onShowPass }: SatellitePassesCardProps) {
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const oldestAgeDays = targets.length === 0
    ? null
    : Math.max(...targets.map((target) => (fromMs - target.epochMs) / DAY_MS))

  const result = useMemo((): { passes: SatellitePass[]; error: string | null } => {
    if (!observer || targets.length === 0 || oldestAgeDays === null || oldestAgeDays > MAX_ELEMENT_AGE_DAYS) {
      return { passes: [], error: null }
    }
    try {
      const passes = targets
        .flatMap((target) => predictPasses(target, observer, { start: new Date(fromMs), hours: SEARCH_HOURS }))
        .filter((pass) => pass.visible)
        .sort((left, right) => left.rise.at.getTime() - right.rise.at.getTime())
      return { passes, error: null }
    } catch (error) {
      return { passes: [], error: error instanceof Error ? error.message : String(error) }
    }
  }, [targets, observer, fromMs, oldestAgeDays])

  return (
    <section className="rounded-xl border border-sky-300/20 bg-sky-300/[0.04] p-2.5" aria-label={t('Görünür uydu geçişleri', 'Visible satellite passes')}>
      <div className="font-mono text-[8px] font-semibold uppercase tracking-[0.17em] text-sky-200/80">
        {t('Görünür uydu geçişleri · 72 sa', 'Visible satellite passes · 72 h')}
      </div>
      <p className="mt-1 text-[8px] leading-relaxed text-slate-500">
        {t(
          'Uydu güneş ışığında, gökyüzü sivil alacakaranlıktan karanlık ve yükseklik ≥10° olduğunda.',
          'When the satellite is sunlit, the sky is darker than civil twilight, and elevation is ≥10°.',
        )}
      </p>

      {!observer ? (
        <p className="mt-2 text-[9px] text-slate-400">{t('Geçişler için konum seçin.', 'Choose a location for passes.')}</p>
      ) : targets.length === 0 ? (
        <p className="mt-2 text-[9px] text-slate-400">{t('İstasyon element setleri henüz yüklenmedi.', 'Station element sets have not loaded yet.')}</p>
      ) : oldestAgeDays !== null && oldestAgeDays > MAX_ELEMENT_AGE_DAYS ? (
        <p role="status" className="mt-2 rounded border border-amber-300/25 bg-amber-300/[0.06] px-2 py-1.5 text-[9px] leading-relaxed text-amber-100">
          {t(
            `Element setleri ${Math.round(oldestAgeDays)} günlük; geçiş saatleri dakikalarca kayacağı için gösterilmiyor. Canlı veri gelince hesaplanır.`,
            `Element sets are ${Math.round(oldestAgeDays)} days old; pass times would drift by minutes, so none are shown. They are computed once live data arrives.`,
          )}
        </p>
      ) : result.error ? (
        <p role="alert" className="mt-2 font-mono text-[8px] text-amber-200">{result.error}</p>
      ) : (
        <>
          {oldestAgeDays !== null && oldestAgeDays > WARN_ELEMENT_AGE_DAYS && (
            <p className="mt-2 font-mono text-[8px] text-amber-200/90">
              {t(
                `Element setleri ${Math.round(oldestAgeDays)} günlük; saatler birkaç dakika kayabilir.`,
                `Element sets are ${Math.round(oldestAgeDays)} days old; times may drift by a few minutes.`,
              )}
            </p>
          )}
          {result.passes.length === 0 ? (
            <p className="mt-2 text-[9px] text-slate-400">{t('Önümüzdeki 72 saatte görünür geçiş yok.', 'No visible passes in the next 72 hours.')}</p>
          ) : (
            <ol className="mt-2 space-y-1.5">
              {result.passes.slice(0, 8).map((pass) => (
                <li key={`${pass.norad}-${pass.rise.at.getTime()}`} className="rounded-lg border border-white/8 bg-black/20 px-2 py-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[9px] font-semibold text-sky-100">{pass.name}</span>
                    <span className="font-mono text-[8px] text-slate-400">{formatTime(pass.visibleFrom ?? pass.rise.at, language)}</span>
                  </div>
                  <div className="mt-0.5 font-mono text-[8px] text-slate-300">
                    {compassPoint(pass.rise.azimuthDeg, language)} → {t('en yüksek', 'max')} {Math.round(pass.culmination.elevationDeg)}° {compassPoint(pass.culmination.azimuthDeg, language)} → {compassPoint(pass.set.azimuthDeg, language)}
                    {' · '}
                    {Math.max(1, Math.round(((pass.visibleTo ?? pass.set.at).getTime() - (pass.visibleFrom ?? pass.rise.at).getTime()) / 60_000))} {t('dk görünür', 'min visible')}
                  </div>
                  <button
                    type="button"
                    onClick={() => onShowPass(pass.norad, pass.culmination.at.getTime())}
                    className="mt-1 font-mono text-[8px] text-sky-200 hover:text-sky-100"
                  >
                    {t('Simülasyonda göster', 'Show in simulation')} →
                  </button>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  )
}
