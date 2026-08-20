import { useId, useMemo, useState } from 'react'
import {
  MIN_USEFUL_ALTITUDE_DEG,
  compassPoint,
  type NightPlan,
} from '@/lib/observation-planner'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

/**
 * Altitude of one target across one night. A single series, so the caption names
 * it and no legend box is drawn; the shaded band behind it is astronomical
 * darkness, and the hairline at 20° is the altitude below which the target is
 * not worth pointing at.
 */
interface AltitudeCurveChartProps {
  plan: NightPlan
  bodyLabel: string
  language: UiLanguage
}

const WIDTH = 332
const HEIGHT = 148
const MARGIN = { top: 10, right: 10, bottom: 16, left: 26 }
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom

function formatClock(timeMs: number, language: UiLanguage): string {
  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  }).format(new Date(timeMs))
}

/** Whole-hour marks across the plotted span, thinned so labels cannot collide. */
function hourTicks(startMs: number, endMs: number): number[] {
  const hourMs = 60 * 60 * 1000
  const first = Math.ceil(startMs / hourMs) * hourMs
  const all: number[] = []
  for (let timeMs = first; timeMs <= endMs; timeMs += hourMs) all.push(timeMs)
  const step = Math.max(1, Math.ceil(all.length / 6))
  return all.filter((_, index) => index % step === 0)
}

export default function AltitudeCurveChart({
  plan,
  bodyLabel,
  language,
}: AltitudeCurveChartProps) {
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const clipId = useId()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const geometry = useMemo(() => {
    const startMs = plan.samples[0].timeMs
    const endMs = plan.samples[plan.samples.length - 1].timeMs
    const lowest = Math.min(...plan.samples.map((sample) => sample.altitudeDeg))
    // The floor follows the data instead of clipping it, so a target that spends
    // the night below the horizon is drawn doing exactly that.
    const yMin = Math.min(0, Math.floor(lowest / 15) * 15)
    const x = (timeMs: number) =>
      MARGIN.left + ((timeMs - startMs) / (endMs - startMs)) * PLOT_WIDTH
    const y = (altitudeDeg: number) =>
      MARGIN.top + ((90 - altitudeDeg) / (90 - yMin)) * PLOT_HEIGHT
    return { startMs, endMs, yMin, x, y }
  }, [plan])

  const path = plan.samples
    .map(
      (sample, index) =>
        `${index === 0 ? 'M' : 'L'}${geometry.x(sample.timeMs).toFixed(1)} ${geometry
          .y(sample.altitudeDeg)
          .toFixed(1)}`,
    )
    .join(' ')

  const windowSamples = plan.best
    ? plan.samples.filter(
        (sample) => sample.timeMs >= plan.best!.startMs && sample.timeMs <= plan.best!.endMs,
      )
    : []
  const windowArea =
    windowSamples.length > 1
      ? `M${geometry.x(windowSamples[0].timeMs).toFixed(1)} ${geometry.y(geometry.yMin).toFixed(1)} ` +
        windowSamples
          .map(
            (sample) =>
              `L${geometry.x(sample.timeMs).toFixed(1)} ${geometry
                .y(sample.altitudeDeg)
                .toFixed(1)}`,
          )
          .join(' ') +
        ` L${geometry.x(windowSamples[windowSamples.length - 1].timeMs).toFixed(1)} ${geometry
          .y(geometry.yMin)
          .toFixed(1)} Z`
      : null

  const hovered = hoverIndex === null ? null : plan.samples[hoverIndex]

  const moveToPointer = (clientX: number, target: SVGSVGElement) => {
    const rect = target.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    const timeMs = geometry.startMs + ratio * (geometry.endMs - geometry.startMs)
    let nearest = 0
    for (let index = 1; index < plan.samples.length; index += 1) {
      if (
        Math.abs(plan.samples[index].timeMs - timeMs) <
        Math.abs(plan.samples[nearest].timeMs - timeMs)
      ) {
        nearest = index
      }
    }
    setHoverIndex(nearest)
  }

  const summary = t(
    `${bodyLabel} yükseklik eğrisi; ${formatClock(geometry.startMs, language)} ile ${formatClock(geometry.endMs, language)} UTC arası.`,
    `Altitude curve for ${bodyLabel} between ${formatClock(geometry.startMs, language)} and ${formatClock(geometry.endMs, language)} UTC.`,
  )

  return (
    <figure className="mt-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={summary}
        tabIndex={0}
        onPointerMove={(event) => moveToPointer(event.clientX, event.currentTarget)}
        onPointerLeave={() => setHoverIndex(null)}
        onFocus={() => setHoverIndex(Math.floor(plan.samples.length / 2))}
        onBlur={() => setHoverIndex(null)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
          event.preventDefault()
          setHoverIndex((current) => {
            const base = current ?? Math.floor(plan.samples.length / 2)
            const next = base + (event.key === 'ArrowRight' ? 1 : -1)
            return Math.max(0, Math.min(plan.samples.length - 1, next))
          })
        }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={MARGIN.left} y={MARGIN.top} width={PLOT_WIDTH} height={PLOT_HEIGHT} />
          </clipPath>
        </defs>

        {plan.darkness && (
          <rect
            x={geometry.x(plan.darkness.startMs)}
            y={MARGIN.top}
            width={geometry.x(plan.darkness.endMs) - geometry.x(plan.darkness.startMs)}
            height={PLOT_HEIGHT}
            className="fill-[color:var(--altitude-darkness)]"
          />
        )}

        {/* Horizon, then the usable-altitude floor. Hairlines, solid, recessive. */}
        <line
          x1={MARGIN.left}
          x2={WIDTH - MARGIN.right}
          y1={geometry.y(0)}
          y2={geometry.y(0)}
          className="stroke-[color:var(--altitude-axis)]"
          strokeWidth={1}
        />
        <line
          x1={MARGIN.left}
          x2={WIDTH - MARGIN.right}
          y1={geometry.y(MIN_USEFUL_ALTITUDE_DEG)}
          y2={geometry.y(MIN_USEFUL_ALTITUDE_DEG)}
          className="stroke-[color:var(--altitude-grid)]"
          strokeWidth={1}
        />

        {[0, 30, 60, 90].map((tick) =>
          tick >= geometry.yMin ? (
            <text
              key={tick}
              x={MARGIN.left - 4}
              y={geometry.y(tick) + 3}
              textAnchor="end"
              className="fill-[color:var(--altitude-muted)] font-mono text-[7px]"
            >
              {tick}°
            </text>
          ) : null,
        )}

        {hourTicks(geometry.startMs, geometry.endMs).map((tick) => (
          <text
            key={tick}
            x={geometry.x(tick)}
            y={HEIGHT - 4}
            textAnchor="middle"
            className="fill-[color:var(--altitude-muted)] font-mono text-[7px]"
          >
            {formatClock(tick, language)}
          </text>
        ))}

        <g clipPath={`url(#${clipId})`}>
          {windowArea && (
            <path d={windowArea} className="fill-[color:var(--altitude-series)] opacity-10" />
          )}
          <path
            d={path}
            fill="none"
            className="stroke-[color:var(--altitude-series)]"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {plan.best && (
            <circle
              cx={geometry.x(plan.best.peakTimeMs)}
              cy={geometry.y(plan.best.peakAltitudeDeg)}
              r={4.5}
              className="fill-[color:var(--altitude-series)] stroke-[color:var(--altitude-surface)]"
              strokeWidth={2}
            />
          )}
        </g>

        {plan.best && (
          <text
            x={Math.min(geometry.x(plan.best.peakTimeMs) + 8, WIDTH - MARGIN.right - 2)}
            y={Math.max(geometry.y(plan.best.peakAltitudeDeg) - 6, MARGIN.top + 7)}
            textAnchor={
              geometry.x(plan.best.peakTimeMs) > WIDTH - MARGIN.right - 44 ? 'end' : 'start'
            }
            className="fill-[color:var(--altitude-ink)] font-mono text-[8px] font-semibold"
          >
            {Math.round(plan.best.peakAltitudeDeg)}°
          </text>
        )}

        {hovered && (
          <g>
            <line
              x1={geometry.x(hovered.timeMs)}
              x2={geometry.x(hovered.timeMs)}
              y1={MARGIN.top}
              y2={MARGIN.top + PLOT_HEIGHT}
              className="stroke-[color:var(--altitude-axis)]"
              strokeWidth={1}
            />
            <circle
              cx={geometry.x(hovered.timeMs)}
              cy={geometry.y(hovered.altitudeDeg)}
              r={4}
              className="fill-[color:var(--altitude-series)] stroke-[color:var(--altitude-surface)]"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>

      <figcaption
        aria-live="polite"
        className="mt-1 flex items-baseline justify-between gap-2 font-mono text-[8px] text-slate-400"
      >
        <span>
          {bodyLabel} · {t('yükseklik', 'altitude')} · UTC
        </span>
        {hovered ? (
          <span className="text-slate-200">
            <span className="font-semibold">{Math.round(hovered.altitudeDeg)}°</span>{' '}
            {compassPoint(hovered.azimuthDeg, language)} · {formatClock(hovered.timeMs, language)}
          </span>
        ) : (
          <span>{t('Gölgeli alan astronomik karanlık', 'Shaded band is astronomical darkness')}</span>
        )}
      </figcaption>
    </figure>
  )
}
