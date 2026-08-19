import {
  PROBE_EPHEMERIS,
  type ProbeEphemerisTable,
} from './generated/probe-ephemeris.ts'
import { J2000_MS, type CartesianPosition } from './orbital-mechanics.ts'

export const HORIZONS_SOURCE_URL = 'https://ssd.jpl.nasa.gov/horizons/'

const TABLES: Record<string, ProbeEphemerisTable> = PROBE_EPHEMERIS.probes
const J2000_JD = 2451545.0
const DAY_MS = 86_400_000

function julianDateToMs(julianDate: number): number {
  return (julianDate - J2000_JD) * DAY_MS + J2000_MS
}

export interface ProbeCoverage {
  startMs: number
  endMs: number
  sampleCount: number
  stepDays: number
}

export function getProbeCoverage(probeId: string): ProbeCoverage | null {
  const table = TABLES[probeId]
  if (!table || table.samples.length < 2) return null
  const startMs = julianDateToMs(table.samples[0][0])
  const endMs = julianDateToMs(table.samples[table.samples.length - 1][0])
  return {
    startMs,
    endMs,
    sampleCount: table.samples.length,
    stepDays: Math.round((table.samples[1][0] - table.samples[0][0]) * 10) / 10,
  }
}

export function hasProbeEphemeris(probeId: string): boolean {
  return getProbeCoverage(probeId) !== null
}

/** Catmull-Rom, which passes through every sample instead of smoothing across them. */
function interpolate(
  before: number,
  start: number,
  end: number,
  after: number,
  fraction: number,
): number {
  const f2 = fraction * fraction
  const f3 = f2 * fraction
  return (
    0.5 *
    (2 * start +
      (-before + end) * fraction +
      (2 * before - 5 * start + 4 * end - after) * f2 +
      (-before + 3 * start - 3 * end + after) * f3)
  )
}

/**
 * Heliocentric position of a spacecraft from the baked JPL Horizons table, or
 * null outside the solution window that table covers. Callers must handle the
 * null rather than extrapolate: a spacecraft trajectory is not a conic section,
 * and running one past its solution invents a path.
 */
export function getProbeHeliocentricAu(
  probeId: string,
  timeMs: number,
): CartesianPosition | null {
  if (!Number.isFinite(timeMs)) throw new Error(`Invalid probe ephemeris time: ${timeMs}`)
  const table = TABLES[probeId]
  if (!table || table.samples.length < 2) return null

  const samples = table.samples
  const targetJd = (timeMs - J2000_MS) / DAY_MS + J2000_JD
  if (targetJd < samples[0][0] || targetJd > samples[samples.length - 1][0]) return null

  let low = 0
  let high = samples.length - 1
  while (high - low > 1) {
    const middle = (low + high) >> 1
    if (samples[middle][0] <= targetJd) low = middle
    else high = middle
  }

  const span = samples[high][0] - samples[low][0]
  if (span <= 0) throw new Error(`Non-monotonic ephemeris samples for ${probeId}`)
  const fraction = (targetJd - samples[low][0]) / span
  const before = samples[Math.max(0, low - 1)]
  const after = samples[Math.min(samples.length - 1, high + 1)]

  return {
    x: interpolate(before[1], samples[low][1], samples[high][1], after[1], fraction),
    y: interpolate(before[2], samples[low][2], samples[high][2], after[2], fraction),
    z: interpolate(before[3], samples[low][3], samples[high][3], after[3], fraction),
  }
}

export const PROBE_EPHEMERIS_META = {
  source: PROBE_EPHEMERIS.source,
  centre: PROBE_EPHEMERIS.centre,
  referencePlane: PROBE_EPHEMERIS.referencePlane,
  stepSize: PROBE_EPHEMERIS.stepSize,
} as const
