import { useMemo, useState } from 'react'
import { CELESTIAL_FACTS } from '@/lib/celestial-facts'
import {
  MIN_USEFUL_ALTITUDE_DEG,
  compassPoint,
  isPlannableBody,
  moonlightInterferes,
  planNightObservation,
  plannableBodyIds,
  type NightPlan,
  type ObservationVerdict,
} from '@/lib/observation-planner'
import type { CelestialBodyId } from '@/lib/planets'
import type { SkyObserver } from '@/lib/sky-events'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'
import AltitudeCurveChart from './AltitudeCurveChart'

interface ObservationPlannerCardProps {
  observer: SkyObserver | null
  /** Evening the plan starts on; the night runs past midnight into the next day. */
  nightOf: Date
  /** Pre-selected target, when the scene is already focused on a plannable body. */
  defaultBodyId: CelestialBodyId
  language: UiLanguage
}

const JPL_HORIZONS_URL = 'https://ssd.jpl.nasa.gov/horizons/'

function bodyName(id: CelestialBodyId, language: UiLanguage): string {
  const fact = CELESTIAL_FACTS[id]
  return language === 'tr' ? fact.nameTr : fact.name
}

function formatClock(timeMs: number, language: UiLanguage): string {
  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  }).format(new Date(timeMs))
}

function formatDuration(ms: number, language: UiLanguage): string {
  const totalMinutes = Math.round(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return language === 'tr' ? `${hours} sa ${minutes} dk` : `${hours} h ${minutes} m`
}

function verdictMessage(verdict: ObservationVerdict, language: UiLanguage): string {
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  switch (verdict) {
    case 'never-high-enough':
      return t(
        `Hedef, karanlık boyunca ${MIN_USEFUL_ALTITUDE_DEG}° eşiğinin üzerine çıkmıyor.`,
        `The target never climbs above the ${MIN_USEFUL_ALTITUDE_DEG}° floor while it is dark.`,
      )
    case 'below-horizon-all-night':
      return t(
        'Hedef karanlık boyunca ufkun altında kalıyor.',
        'The target stays below the horizon for the whole dark period.',
      )
    case 'no-darkness':
      return t(
        'Bu tarihte bu enlemde astronomik karanlık oluşmuyor.',
        'Astronomical darkness does not occur at this latitude on this date.',
      )
    default:
      return ''
  }
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded border border-white/10 bg-black/15 px-2 py-1.5">
      <div className="font-mono text-[7px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-0.5 font-mono text-[10px] font-semibold text-slate-100">{value}</div>
      {note && <div className="mt-0.5 font-mono text-[7px] text-slate-500">{note}</div>}
    </div>
  )
}

function PlanReadout({ plan, language }: { plan: NightPlan; language: UiLanguage }) {
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const label = bodyName(plan.bodyId, language)

  return (
    <>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <StatTile
          label={t('En iyi pencere', 'Best window')}
          value={
            plan.best
              ? `${formatClock(plan.best.startMs, language)}–${formatClock(plan.best.endMs, language)}`
              : '—'
          }
          note={
            plan.best
              ? formatDuration(plan.best.endMs - plan.best.startMs, language)
              : t('Uygun aralık yok', 'No usable stretch')
          }
        />
        <StatTile
          label={t('Doruk yüksekliği', 'Peak altitude')}
          value={plan.best ? `${Math.round(plan.best.peakAltitudeDeg)}°` : '—'}
          note={
            plan.best
              ? `${compassPoint(plan.best.peakAzimuthDeg, language)} · ${formatClock(plan.best.peakTimeMs, language)}`
              : undefined
          }
        />
        <StatTile
          label={t('Görünen kadir', 'Apparent magnitude')}
          value={plan.apparentMagnitude.toFixed(1)}
          note={t('JPL efemerisinden', 'From the JPL ephemeris')}
        />
        <StatTile
          label={t('Ay ışığı', 'Moonlight')}
          value={
            language === 'tr'
              ? `%${Math.round(plan.moonIllumination * 100)}`
              : `${Math.round(plan.moonIllumination * 100)}%`
          }
          note={
            plan.moonSeparationDeg === null
              ? t('Hedefin kendisi', 'The target itself')
              : `${Math.round(plan.moonSeparationDeg)}° ${t('uzakta', 'away')}`
          }
        />
      </div>

      <div className="altitude-curve">
        <AltitudeCurveChart plan={plan} bodyLabel={label} language={language} />
      </div>

      {plan.verdict !== 'observable' && (
        <p className="mt-1.5 rounded border border-amber-300/25 bg-amber-300/[0.06] px-2 py-1.5 font-mono text-[8px] leading-relaxed text-amber-100">
          {verdictMessage(plan.verdict, language)}
        </p>
      )}

      {moonlightInterferes(plan) && (
        <p className="mt-1.5 font-mono text-[8px] leading-relaxed text-slate-400">
          {t(
            'Parlak Ay hedefe yakın; gökyüzü fonu yükselecek.',
            'A bright Moon sits close to the target; the sky background will be raised.',
          )}
        </p>
      )}

      <dl className="mt-1.5 grid grid-cols-3 gap-x-2 font-mono text-[8px]">
        <div>
          <dt className="text-slate-500">{t('Doğuş', 'Rise')}</dt>
          <dd className="text-slate-300">
            {plan.rise === null ? '—' : formatClock(plan.rise, language)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('Meridyen', 'Transit')}</dt>
          <dd className="text-slate-300">
            {plan.transit === null ? '—' : formatClock(plan.transit.timeMs, language)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('Batış', 'Set')}</dt>
          <dd className="text-slate-300">
            {plan.set === null ? '—' : formatClock(plan.set, language)}
          </dd>
        </div>
      </dl>

      <details className="mt-1.5">
        <summary className="cursor-pointer font-mono text-[8px] text-slate-500 hover:text-slate-300">
          {t('Saatlik veri tablosu', 'Hourly data table')}
        </summary>
        <table className="mt-1.5 w-full font-mono text-[8px]">
          <caption className="sr-only">
            {t(
              `${label} için saatlik yükseklik ve azimut, UTC`,
              `Hourly altitude and azimuth for ${label}, UTC`,
            )}
          </caption>
          <thead>
            <tr className="text-slate-500">
              <th scope="col" className="text-left font-normal">UTC</th>
              <th scope="col" className="text-right font-normal">{t('Yükseklik', 'Altitude')}</th>
              <th scope="col" className="text-right font-normal">{t('Azimut', 'Azimuth')}</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {plan.samples
              .filter((_, index) => index % 12 === 0)
              .map((sample) => (
                <tr key={sample.timeMs}>
                  <td>{formatClock(sample.timeMs, language)}</td>
                  <td className="text-right">{Math.round(sample.altitudeDeg)}°</td>
                  <td className="text-right">
                    {Math.round(sample.azimuthDeg)}° {compassPoint(sample.azimuthDeg, language)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </>
  )
}

export default function ObservationPlannerCard({
  observer,
  nightOf,
  defaultBodyId,
  language,
}: ObservationPlannerCardProps) {
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const targets = plannableBodyIds()
  const [requestedBody, setRequestedBody] = useState<CelestialBodyId | null>(null)
  const selectedBody =
    requestedBody ?? (isPlannableBody(defaultBodyId) ? defaultBodyId : 'saturn')

  const nightKey = nightOf.toISOString().slice(0, 10)
  const plan = useMemo(
    () =>
      observer
        ? planNightObservation({
            bodyId: selectedBody,
            observer,
            nightOf: new Date(`${nightKey}T00:00:00Z`),
          })
        : null,
    [observer, selectedBody, nightKey],
  )

  return (
    <section
      className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.035] p-2.5"
      aria-label={t('Gözlem planlayıcı', 'Observation planner')}
    >
      <div className="font-mono text-[8px] font-semibold uppercase tracking-[0.17em] text-cyan-200/80">
        {t('Gözlem planlayıcı', 'Observation planner')}
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
        {targets.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setRequestedBody(id)}
            aria-pressed={id === selectedBody}
            className={`rounded border px-1.5 py-1 font-mono text-[8px] transition-colors ${
              id === selectedBody
                ? 'border-cyan-300/50 bg-cyan-300/[0.13] text-cyan-100'
                : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-slate-200'
            }`}
          >
            {bodyName(id, language)}
          </button>
        ))}
      </div>

      {plan ? (
        <PlanReadout plan={plan} language={language} />
      ) : (
        <p className="mt-2 font-mono text-[9px] leading-relaxed text-slate-400">
          {t(
            'Yükseklik eğrisi ve gözlem penceresi için konum seçin.',
            'Choose a location for the altitude curve and the observing window.',
          )}
        </p>
      )}

      <p className="mt-2 font-mono text-[7px] leading-relaxed text-slate-500">
        {t(
          `Karanlık, Güneş -18°'nin altındayken sayılır; ${MIN_USEFUL_ALTITUDE_DEG}° eşiği atmosferik sönümleme içindir. Bulutluluk ve yerel engeller hesaba katılmaz.`,
          `Darkness counts while the Sun is below -18°; the ${MIN_USEFUL_ALTITUDE_DEG}° floor is for atmospheric extinction. Cloud cover and local obstructions are not modelled.`,
        )}
      </p>
      <a
        href={JPL_HORIZONS_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-block font-mono text-[8px] text-cyan-200 hover:text-cyan-100"
      >
        {t('Konum efemerisi', 'Position ephemeris')} ↗
      </a>
    </section>
  )
}
