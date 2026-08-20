import {
  AngleBetween,
  Body,
  Equator,
  GeoVector,
  Horizon,
  Illumination,
  Observer,
  SearchAltitude,
  SearchHourAngle,
  SearchRiseSet,
} from 'astronomy-engine'
import type { CelestialBodyId } from './planets.ts'
import type { SkyObserver } from './sky-events.ts'
import type { UiLanguage } from './ui-language.ts'

/**
 * Night-by-night observing planner: where a body actually sits in the sky from
 * one place on Earth, and whether that adds up to a usable session.
 *
 * Everything here is computed from astronomy-engine's own ephemeris rather than
 * from the scene, because the scene draws compressed distances and cannot
 * answer a question about altitude above a real horizon.
 */

/**
 * Altitude below which a target is not worth planning around. Airmass is
 * roughly 1/sin(altitude), so 20° already means looking through about 2.9
 * atmospheres — enough extinction and turbulence to spoil the view even in a
 * clear sky.
 */
export const MIN_USEFUL_ALTITUDE_DEG = 20

/** Sun altitude that defines astronomical darkness. */
export const ASTRONOMICAL_TWILIGHT_DEG = -18

/** Spacing of the altitude curve, in minutes. */
export const ALTITUDE_SAMPLE_MINUTES = 5

/** Full Moon washes out faint targets within roughly this angular distance. */
export const MOON_GLARE_SEPARATION_DEG = 45

const MINUTE_MS = 60_000

/**
 * Bodies the planner covers. The Sun is deliberately absent: this plans night
 * sessions, and solar observing is a different activity with its own filter
 * requirements.
 */
const PLANNABLE_BODIES: Partial<Record<CelestialBodyId, Body>> = {
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
  pluto: Body.Pluto,
}

export function isPlannableBody(bodyId: CelestialBodyId): boolean {
  return PLANNABLE_BODIES[bodyId] !== undefined
}

export function plannableBodyIds(): CelestialBodyId[] {
  return Object.keys(PLANNABLE_BODIES) as CelestialBodyId[]
}

function resolveBody(bodyId: CelestialBodyId): Body {
  const body = PLANNABLE_BODIES[bodyId]
  if (!body) {
    throw new Error(
      `No ephemeris available for observation planning of ${bodyId}; call isPlannableBody first`,
    )
  }
  return body
}

export interface AltitudeSample {
  timeMs: number
  altitudeDeg: number
  azimuthDeg: number
}

export interface TimeSpan {
  startMs: number
  endMs: number
}

export interface ObservationWindow extends TimeSpan {
  peakTimeMs: number
  peakAltitudeDeg: number
  peakAzimuthDeg: number
}

/**
 * Why the night turned out the way it did. `observable` is the only outcome
 * that yields a window; the rest name the specific obstacle rather than
 * returning an empty result with no explanation.
 */
export type ObservationVerdict =
  | 'observable'
  | 'never-high-enough'
  | 'below-horizon-all-night'
  | 'no-darkness'

export interface NightPlan {
  bodyId: CelestialBodyId
  observer: SkyObserver
  /**
   * The dark half of the day: sunset to sunrise at most latitudes, the whole
   * 24 hours under a polar night, and null under the midnight sun.
   */
  night: TimeSpan | null
  /** The part of that night with the Sun below -18°, if any. */
  darkness: TimeSpan | null
  /** Altitude curve across the plotted span, every ALTITUDE_SAMPLE_MINUTES. */
  samples: AltitudeSample[]
  /** Longest usable stretch: dark, and above MIN_USEFUL_ALTITUDE_DEG. */
  best: ObservationWindow | null
  /** Upper culmination during the plotted span. */
  transit: AltitudeSample | null
  /** Rise and set, but only when they fall inside the plotted night. A set time
   * from the following afternoon is not part of tonight's plan. */
  rise: number | null
  set: number | null
  /** Apparent visual magnitude at the peak, from astronomy-engine. */
  apparentMagnitude: number
  /** Illuminated fraction of the Moon's disc during the night, 0 to 1. */
  moonIllumination: number
  /** Angular distance from the Moon at the peak. Null when the target is the Moon. */
  moonSeparationDeg: number | null
  verdict: ObservationVerdict
}

function altitudeAt(body: Body, observer: Observer, timeMs: number): AltitudeSample {
  const date = new Date(timeMs)
  const equatorial = Equator(body, date, observer, true, true)
  const horizontal = Horizon(date, observer, equatorial.ra, equatorial.dec, 'normal')
  return { timeMs, altitudeDeg: horizontal.altitude, azimuthDeg: horizontal.azimuth }
}

/** Local solar noon on the requested date, the anchor the night is searched from. */
function localNoonMs(nightOf: Date, observer: SkyObserver): number {
  const utcMidnight = Date.UTC(
    nightOf.getUTCFullYear(),
    nightOf.getUTCMonth(),
    nightOf.getUTCDate(),
  )
  // Longitude fixes the offset from UTC noon; 15° of longitude is one hour.
  return utcMidnight + 12 * 60 * MINUTE_MS - (observer.longitude / 15) * 60 * MINUTE_MS
}

function sunAltitudeDeg(observer: Observer, timeMs: number): number {
  return altitudeAt(Body.Sun, observer, timeMs).altitudeDeg
}

/**
 * The night around the given local noon. Above the polar circles the Sun may
 * not cross the horizon at all, and the two ways that happens are opposites:
 * under the midnight sun there is no night, while under a polar night the whole
 * day is one. Distinguishing them by the Sun's actual altitude is the only way
 * to get both right.
 */
function findNight(observer: Observer, noonMs: number): TimeSpan | null {
  const dayMs = 24 * 60 * MINUTE_MS
  const sunset = SearchRiseSet(Body.Sun, observer, -1, new Date(noonMs), 1)
  if (sunset) {
    const sunrise = SearchRiseSet(Body.Sun, observer, +1, sunset.date, 1)
    if (sunrise) return { startMs: sunset.date.getTime(), endMs: sunrise.date.getTime() }
  }
  // The Sun stayed on one side of the horizon for the whole day.
  return sunAltitudeDeg(observer, noonMs) < 0 ? { startMs: noonMs, endMs: noonMs + dayMs } : null
}

function findDarkness(observer: Observer, night: TimeSpan): TimeSpan | null {
  const start = SearchAltitude(
    Body.Sun,
    observer,
    -1,
    new Date(night.startMs),
    1,
    ASTRONOMICAL_TWILIGHT_DEG,
  )
  if (!start || start.date.getTime() >= night.endMs) {
    // No crossing of -18° inside the night: either it never gets dark, or it
    // never stops being dark. The Sun's altitude mid-night says which.
    const middleMs = (night.startMs + night.endMs) / 2
    return sunAltitudeDeg(observer, middleMs) < ASTRONOMICAL_TWILIGHT_DEG ? night : null
  }
  const end = SearchAltitude(
    Body.Sun,
    observer,
    +1,
    start.date,
    1,
    ASTRONOMICAL_TWILIGHT_DEG,
  )
  return {
    startMs: start.date.getTime(),
    endMs: end ? Math.min(end.date.getTime(), night.endMs) : night.endMs,
  }
}

function sampleAltitudes(body: Body, observer: Observer, span: TimeSpan): AltitudeSample[] {
  const step = ALTITUDE_SAMPLE_MINUTES * MINUTE_MS
  const samples: AltitudeSample[] = []
  for (let timeMs = span.startMs; timeMs <= span.endMs; timeMs += step) {
    samples.push(altitudeAt(body, observer, timeMs))
  }
  // Always include the closing instant so the curve reaches the end of the night.
  if (samples[samples.length - 1]?.timeMs !== span.endMs) {
    samples.push(altitudeAt(body, observer, span.endMs))
  }
  return samples
}

/**
 * The longest stretch that is both dark and high enough to be worth pointing at.
 * Without astronomical darkness there is no window at all, which is what makes a
 * Nordic summer night unusable however high the target climbs.
 */
function longestUsableRun(
  samples: AltitudeSample[],
  darkness: TimeSpan | null,
): ObservationWindow | null {
  if (!darkness) return null
  let best: ObservationWindow | null = null
  let run: AltitudeSample[] = []

  const close = () => {
    if (run.length < 2) {
      run = []
      return
    }
    const peak = run.reduce((high, sample) =>
      sample.altitudeDeg > high.altitudeDeg ? sample : high,
    )
    const candidate: ObservationWindow = {
      startMs: run[0].timeMs,
      endMs: run[run.length - 1].timeMs,
      peakTimeMs: peak.timeMs,
      peakAltitudeDeg: peak.altitudeDeg,
      peakAzimuthDeg: peak.azimuthDeg,
    }
    if (!best || candidate.endMs - candidate.startMs > best.endMs - best.startMs) {
      best = candidate
    }
    run = []
  }

  for (const sample of samples) {
    const dark = sample.timeMs >= darkness.startMs && sample.timeMs <= darkness.endMs
    if (dark && sample.altitudeDeg >= MIN_USEFUL_ALTITUDE_DEG) run.push(sample)
    else close()
  }
  close()
  return best
}

function moonSeparationDeg(body: Body, timeMs: number): number | null {
  if (body === Body.Moon) return null
  const date = new Date(timeMs)
  return AngleBetween(GeoVector(body, date, true), GeoVector(Body.Moon, date, true))
}

function apparentMagnitude(body: Body, timeMs: number): number {
  return Illumination(body, new Date(timeMs)).mag
}

function decideVerdict(
  samples: AltitudeSample[],
  night: TimeSpan | null,
  darkness: TimeSpan | null,
  best: ObservationWindow | null,
): ObservationVerdict {
  if (best) return 'observable'
  if (!night || !darkness) return 'no-darkness'
  const inDark = samples.filter(
    (sample) => sample.timeMs >= darkness.startMs && sample.timeMs <= darkness.endMs,
  )
  const peak = inDark.reduce(
    (high, sample) => Math.max(high, sample.altitudeDeg),
    Number.NEGATIVE_INFINITY,
  )
  return peak <= 0 ? 'below-horizon-all-night' : 'never-high-enough'
}

/**
 * Plans one night for one body from one place. `nightOf` selects the date whose
 * evening the plan starts on; the night itself runs past local midnight into the
 * following morning.
 */
export function planNightObservation(input: {
  bodyId: CelestialBodyId
  observer: SkyObserver
  nightOf: Date
}): NightPlan {
  const { bodyId, observer, nightOf } = input
  if (!Number.isFinite(nightOf.getTime())) {
    throw new Error(`Observation night requires a valid date; received ${nightOf.toString()}`)
  }
  const body = resolveBody(bodyId)
  const astroObserver = new Observer(observer.latitude, observer.longitude, 0)

  const noonMs = localNoonMs(nightOf, observer)
  const night = findNight(astroObserver, noonMs)
  const darkness = night ? findDarkness(astroObserver, night) : null
  // With no night, the curve still covers the 24 hours around local noon so the
  // reader can see how the target moves even when it cannot be observed.
  const span: TimeSpan = night ?? { startMs: noonMs, endMs: noonMs + 24 * 60 * MINUTE_MS }

  const samples = sampleAltitudes(body, astroObserver, span)
  const sampledBest = longestUsableRun(samples, darkness)

  const hourAngle = SearchHourAngle(body, astroObserver, 0, new Date(span.startMs))
  const transitMs = hourAngle.time.date.getTime()
  const transit =
    transitMs >= span.startMs && transitMs <= span.endMs
      ? altitudeAt(body, astroObserver, transitMs)
      : null

  // The curve is sampled every few minutes, so its highest sample is near the
  // culmination but not on it. When the exact culmination falls inside the
  // window, it is the peak — otherwise the panel would print a peak time two
  // minutes away from the transit time it prints beside it.
  const best =
    sampledBest && transit && transit.timeMs >= sampledBest.startMs && transit.timeMs <= sampledBest.endMs
      ? {
          ...sampledBest,
          peakTimeMs: transit.timeMs,
          peakAltitudeDeg: transit.altitudeDeg,
          peakAzimuthDeg: transit.azimuthDeg,
        }
      : sampledBest

  const withinSpan = (event: { date: Date } | null): number | null => {
    if (!event) return null
    const timeMs = event.date.getTime()
    return timeMs >= span.startMs && timeMs <= span.endMs ? timeMs : null
  }
  const rise = withinSpan(SearchRiseSet(body, astroObserver, +1, new Date(span.startMs), 1))
  const set = withinSpan(SearchRiseSet(body, astroObserver, -1, new Date(span.startMs), 1))
  const reference = best?.peakTimeMs ?? transit?.timeMs ?? span.startMs

  return {
    bodyId,
    observer,
    night,
    darkness,
    samples,
    best,
    transit,
    rise,
    set,
    apparentMagnitude: apparentMagnitude(body, reference),
    moonIllumination: Illumination(Body.Moon, new Date(reference)).phase_fraction,
    moonSeparationDeg: moonSeparationDeg(body, reference),
    verdict: decideVerdict(samples, night, darkness, best),
  }
}

const COMPASS_POINTS: Array<[string, string]> = [
  ['K', 'N'],
  ['KD', 'NE'],
  ['D', 'E'],
  ['GD', 'SE'],
  ['G', 'S'],
  ['GB', 'SW'],
  ['B', 'W'],
  ['KB', 'NW'],
]

/** Eight-point compass label for an azimuth measured clockwise from north. */
export function compassPoint(azimuthDeg: number, language: UiLanguage): string {
  if (!Number.isFinite(azimuthDeg)) {
    throw new Error(`Invalid azimuth: ${azimuthDeg}`)
  }
  const normalized = ((azimuthDeg % 360) + 360) % 360
  const index = Math.round(normalized / 45) % COMPASS_POINTS.length
  return COMPASS_POINTS[index][language === 'tr' ? 0 : 1]
}

/**
 * Whether moonlight is likely to interfere: a bright Moon close to the target
 * raises the sky background enough to matter, a thin crescent far away does not.
 */
export function moonlightInterferes(plan: NightPlan): boolean {
  if (plan.moonSeparationDeg === null) return false
  return plan.moonIllumination > 0.5 && plan.moonSeparationDeg < MOON_GLARE_SEPARATION_DEG
}
