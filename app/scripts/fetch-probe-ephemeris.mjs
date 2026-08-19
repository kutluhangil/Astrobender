/**
 * Bakes heliocentric spacecraft vectors from the JPL Horizons API into a table
 * the client ships with the app.
 *
 * A runtime fetch was rejected: Horizons sends no CORS headers, the app is an
 * installable PWA that must keep working offline, and a spacecraft ephemeris
 * changes on the scale of months, not seconds. Re-run this script and commit
 * the result when the coverage window is about to lapse.
 *
 *   node scripts/fetch-probe-ephemeris.mjs
 */
import { writeFileSync } from 'node:fs'

const HORIZONS = 'https://ssd.jpl.nasa.gov/api/horizons.api'
const OUTPUT = new URL('../src/lib/generated/probe-ephemeris.ts', import.meta.url)

/** Horizons spacecraft ids, keyed by the probe ids in src/lib/probes.ts. */
const PROBE_COMMANDS = {
  voyager1: '-31',
  voyager2: '-32',
  jwst: '-170',
  newhorizons: '-98',
  'europa-clipper': '-159',
  juno: '-61',
  'parker-solar-probe': '-96',
}

const START = '2024-01-01'
const STOP = '2032-01-01'
const DEFAULT_STEP = '10d'

/**
 * Probes on tight orbits need denser sampling: Parker Solar Probe rounds the
 * Sun in 88 days and a 10-day step aliased its perihelion passes by 0.02 au.
 */
const PROBE_STEPS = {
  'parker-solar-probe': '2d',
  juno: '5d',
}

function parseVectors(text, probeId) {
  const start = text.indexOf('$$SOE')
  const end = text.indexOf('$$EOE')
  if (start < 0 || end < 0) {
    const excerpt = text.replace(/\s+/g, ' ').slice(0, 400)
    throw new Error(`Horizons returned no vector block for ${probeId}: ${excerpt}`)
  }
  const block = text.slice(start + 5, end)
  const rows = []
  const pattern =
    /(\d+\.\d+)\s*=\s*A\.D\.[^\n]*\n\s*X\s*=\s*(-?[\d.E+-]+)\s*Y\s*=\s*(-?[\d.E+-]+)\s*Z\s*=\s*(-?[\d.E+-]+)/g
  let match
  while ((match = pattern.exec(block)) !== null) {
    rows.push([
      Number(match[1]),
      Number(Number(match[2]).toFixed(6)),
      Number(Number(match[3]).toFixed(6)),
      Number(Number(match[4]).toFixed(6)),
    ])
  }
  if (rows.length === 0) {
    throw new Error(`Horizons vector block for ${probeId} contained no parsable rows`)
  }
  return rows
}

const MONTHS = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
}

/**
 * Every spacecraft has its own solution span, so a request outside it is
 * answered with the span rather than with data. The bounds are read back out
 * and the request is retried once, clamped one day inside them.
 */
function clampedWindow(text, start, stop) {
  const after = text.match(/after A\.D\. (\d{4})-([A-Z]{3})-(\d{2})/)
  const before = text.match(/prior to A\.D\. (\d{4})-([A-Z]{3})-(\d{2})/)
  const toIso = (match, dayShift) => {
    const date = new Date(Date.UTC(Number(match[1]), Number(MONTHS[match[2]]) - 1, Number(match[3])))
    date.setUTCDate(date.getUTCDate() + dayShift)
    return date.toISOString().slice(0, 10)
  }
  if (!after && !before) return null
  return {
    start: before ? toIso(before, 1) : start,
    stop: after ? toIso(after, -1) : stop,
  }
}

async function requestVectors(command, start, stop, step) {
  const query = new URLSearchParams({
    format: 'text',
    COMMAND: `'${command}'`,
    OBJ_DATA: 'NO',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'VECTORS',
    CENTER: "'500@10'",
    REF_PLANE: 'FRAME',
    OUT_UNITS: 'AU-D',
    START_TIME: `'${start}'`,
    STOP_TIME: `'${stop}'`,
    STEP_SIZE: `'${step}'`,
    VEC_TABLE: '1',
  })
  const response = await fetch(`${HORIZONS}?${query}`)
  if (!response.ok) {
    const body = (await response.text()).replace(/\s+/g, ' ').slice(0, 200)
    throw new Error(
      `Horizons returned HTTP ${response.status} ${response.statusText} — ${body}`,
    )
  }
  return response.text()
}

async function fetchProbe(probeId, command) {
  const step = PROBE_STEPS[probeId] ?? DEFAULT_STEP
  let start = START
  let stop = STOP
  let text = await requestVectors(command, start, stop, step)
  if (text.indexOf('$$SOE') < 0) {
    const window = clampedWindow(text, start, stop)
    if (!window) return parseVectors(text, probeId)
    start = window.start
    stop = window.stop
    text = await requestVectors(command, start, stop, step)
  }
  return { samples: parseVectors(text, probeId), start, stop, step }
}

const probes = {}
for (const [probeId, command] of Object.entries(PROBE_COMMANDS)) {
  const { samples, start, stop, step } = await fetchProbe(probeId, command)
  probes[probeId] = { command, startTime: start, stopTime: stop, stepSize: step, samples }
  console.log(`${probeId}: ${samples.length} samples every ${step} (${start} → ${stop})`)
}

const payload = {
  source: 'https://ssd.jpl.nasa.gov/horizons/',
  centre: 'Sun (500@10)',
  referencePlane: 'ICRF equatorial',
  units: 'au',
  startTime: START,
  stopTime: STOP,
  stepSize: DEFAULT_STEP,
  probes,
}

// Emitted as a module rather than JSON so the client bundler and the Node test
// runner load it the same way, with no import-attribute divergence between them.
const module = `// Generated by scripts/fetch-probe-ephemeris.mjs — do not edit by hand.
// Source: JPL Horizons (${payload.source}), centre ${payload.centre},
// ${payload.referencePlane}, ${payload.units}, step ${payload.stepSize}.

export interface ProbeEphemerisTable {
  /** Horizons spacecraft id the samples were requested with. */
  command: string
  startTime: string
  stopTime: string
  /** Horizons step size this probe was sampled at. */
  stepSize: string
  /** [julianDate, x, y, z] rows in au. */
  samples: number[][]
}

export interface ProbeEphemerisFile {
  source: string
  centre: string
  referencePlane: string
  units: string
  startTime: string
  stopTime: string
  stepSize: string
  probes: Record<string, ProbeEphemerisTable>
}

export const PROBE_EPHEMERIS: ProbeEphemerisFile = ${JSON.stringify(payload, null, 0)}
`

writeFileSync(OUTPUT, module)
console.log(`Wrote ${OUTPUT.pathname}`)
