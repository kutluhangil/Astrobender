// Satellite data model: OMM parsing, validation, classification, grouping.
//
// The catalog is merged from five CelesTrak GP feeds, read as OMM CSV because
// the TLE format cannot carry catalog numbers above 99999 (see omm.ts):
//   active                -> classified by name into stations/gps/.../other
//   visual                -> "Brightest" layer (overrides the active class)
//   cosmos-2251-debris    -> Debris · Cosmos-2251
//   iridium-33-debris     -> Debris · Iridium-33
//   fengyun-1c-debris     -> Debris · Fengyun-1C
// Every object appears in exactly one layer; layer counts sum to the total.

import { OMM_REQUIRED_COLUMNS, parseOmmCsv, type OmmElements } from './omm.ts'

export interface SatInfo {
  name: string
  norad: number
  /** Mean elements SGP4 is initialised from. */
  elements: OmmElements
  /** UI group index (see UI_GROUPS). */
  group: number
  /** Element-set epoch as ms since Unix epoch. */
  epochMs: number
}

export interface UiGroupDef {
  key: string
  label: string
  color: string
  size: number
}

/** UI layers, in render order. Counts are computed from the loaded data. */
export const UI_GROUPS: UiGroupDef[] = [
  { key: 'stations', label: 'Space Stations', color: '#ffd166', size: 2.6 },
  { key: 'gps', label: 'GPS', color: '#4ade80', size: 1.5 },
  { key: 'glonass', label: 'GLONASS', color: '#a3e635', size: 1.5 },
  { key: 'galileo', label: 'Galileo', color: '#2dd4bf', size: 1.5 },
  { key: 'weather', label: 'Weather', color: '#f472b6', size: 1.5 },
  { key: 'oneweb', label: 'OneWeb', color: '#a78bfa', size: 1.35 },
  { key: 'starlink', label: 'Starlink', color: '#38bdf8', size: 1.15 },
  { key: 'brightest', label: 'Brightest', color: '#e8eef7', size: 1.7 },
  { key: 'debris-cosmos', label: 'Debris · Cosmos-2251', color: '#fb7185', size: 1.0 },
  { key: 'debris-iridium', label: 'Debris · Iridium-33', color: '#fb923c', size: 1.0 },
  { key: 'debris-fengyun', label: 'Debris · Fengyun-1C', color: '#ef4444', size: 1.0 },
  { key: 'other', label: 'Other Active', color: '#9aa7bd', size: 1.0 },
]

const G = {
  Stations: 0,
  Gps: 1,
  Glonass: 2,
  Galileo: 3,
  Weather: 4,
  OneWeb: 5,
  Starlink: 6,
  Brightest: 7,
  DebrisCosmos: 8,
  DebrisIridium: 9,
  DebrisFengyun: 10,
  Other: 11,
} as const

const WEATHER_PREFIXES = [
  'NOAA', 'GOES', 'METEOSAT', 'METOP', 'FENGYUN', 'FY-', 'HIMAWARI',
  'ELECTRO-L', 'DMSP', 'GOMS', 'INSAT', 'KALPANA', 'GEO-KOMPSAT',
]

/** Classify an active-catalog name into a UI group index. */
function classifyActive(nameRaw: string): number {
  const n = nameRaw.trim().toUpperCase()
  // Whole-word station names only: a bare substring test pulls in AISSAT,
  // SWISSCUBE and "OUTPOST MISSION".
  if (
    /^ISS \(/.test(n) || n.includes('ZARYA') || n.startsWith('TIANGONG') ||
    /^CSS \(/.test(n) || n.includes('TIANHE') || n.includes('WENTIAN') ||
    n.includes('MENGTIAN')
  ) {
    return G.Stations
  }
  if (n.startsWith('GPS ') || n.startsWith('NAVSTAR')) return G.Gps
  if (n.includes('GLONASS')) return G.Glonass
  // Galileo names read "GSAT0101 (GALILEO-PFM)"; ISRO's "GSAT-7" etc. are not Galileo.
  if (n.includes('GALILEO')) return G.Galileo
  if (n.startsWith('STARLINK')) return G.Starlink
  if (n.startsWith('ONEWEB')) return G.OneWeb
  for (const p of WEATHER_PREFIXES) if (n.startsWith(p)) return G.Weather
  return G.Other // includes BeiDou, Iridium, everything else
}

/** OMM CSV texts of the five feeds; supplementals may be null if unavailable. */
export interface FeedTexts {
  active: string
  visual: string | null
  cosmos2251: string | null
  iridium33: string | null
  fengyun1c: string | null
}

/**
 * Merge all feeds into validated, NORAD-deduplicated, group-sorted records.
 * Precedence: debris clouds first, then classified active objects, then the
 * visual feed overrides matched objects into the Brightest layer.
 */
export function mergeFeeds(feeds: FeedTexts): SatInfo[] {
  return mergeFeedsWithReport(feeds).sats
}

export interface MergeReport {
  sats: SatInfo[]
  /** Rows each feed dropped because a required value was missing or not numeric. */
  skipped: Partial<Record<keyof FeedTexts, number>>
}

/** `mergeFeeds` plus the per-feed count of malformed rows, so callers can surface them. */
export function mergeFeedsWithReport(feeds: FeedTexts): MergeReport {
  const byNorad = new Map<number, SatInfo>()
  const skipped: MergeReport['skipped'] = {}
  const parse = (key: keyof FeedTexts, text: string) => {
    const result = parseOmmCsv(text)
    if (result.skipped > 0) skipped[key] = result.skipped
    return result.records
  }

  const add = (elements: OmmElements, group: number, override: boolean) => {
    if (!override && byNorad.has(elements.norad)) return
    byNorad.set(elements.norad, {
      name: elements.name,
      norad: elements.norad,
      elements,
      group,
      epochMs: elements.epochMs,
    })
  }

  for (const [key, group] of [
    ['cosmos2251', G.DebrisCosmos],
    ['iridium33', G.DebrisIridium],
    ['fengyun1c', G.DebrisFengyun],
  ] as const) {
    const text = feeds[key]
    if (!text) continue
    for (const r of parse(key, text)) add(r, group, false)
  }

  for (const r of parse('active', feeds.active)) add(r, classifyActive(r.name), false)

  if (feeds.visual) {
    for (const r of parse('visual', feeds.visual)) add(r, G.Brightest, true)
  }

  const sats = [...byNorad.values()]
  sats.sort((a, b) => a.group - b.group)
  return { sats, skipped }
}

/** Data rows in an OMM CSV text (lines after the header), without parsing values. */
export function countGpRows(text: string): number {
  let rows = 0
  let index = text.indexOf('\n')
  while (index !== -1 && index < text.length - 1) {
    rows++
    index = text.indexOf('\n', index + 1)
  }
  return rows
}

/** The active feed must parse to at least this many objects to be accepted. */
export const MIN_VALID_SATS = 1000

/**
 * Structural check before a feed replaces the last good one: an OMM CSV header
 * naming every column SGP4 needs, followed by at least one data row.
 */
export function isValidGpCsv(text: string | null | undefined): boolean {
  if (!text) return false
  const newline = text.indexOf('\n')
  if (newline < 0 || newline === text.length - 1) return false
  const header = new Set(
    text.slice(0, newline).replace(/^\uFEFF/, '').split(',').map((column) => column.trim().toUpperCase()),
  )
  return OMM_REQUIRED_COLUMNS.every((column) => header.has(column))
}

export type DataSource = 'live' | 'cached' | 'snapshot'

export interface Dataset {
  sats: SatInfo[]
  counts: number[]
  /** median TLE epoch in the set (ms) */
  epochMs: number
  source: DataSource
  /** when the data was fetched from the network (ms) */
  fetchedAt: number
  /** total deduplicated objects */
  total: number
}

export function buildDataset(
  sats: SatInfo[],
  source: DataSource,
  fetchedAt: number,
): Dataset {
  const counts = new Array(UI_GROUPS.length).fill(0)
  const epochs: number[] = []
  for (const s of sats) {
    counts[s.group]++
    if (s.epochMs > 0) epochs.push(s.epochMs)
  }
  // median epoch is robust against a few future-dated or stale TLEs
  epochs.sort((a, b) => a - b)
  const epoch = epochs.length ? epochs[Math.floor(epochs.length / 2)] : 0
  return { sats, counts, epochMs: epoch, source, fetchedAt, total: sats.length }
}

/** "3h 12m" / "2d 4h" style age string from the median TLE epoch. */
export function tleAge(epochMs: number, nowMs: number): string {
  if (!epochMs) return 'unknown'
  const mins = Math.max(0, Math.round((nowMs - epochMs) / 60000))
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  if (h < 48) return `${h}h ${mins % 60}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

export function formatUtc(ms: number): string {
  const d = new Date(ms)
  const p = (v: number) => String(v).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`
  )
}

/** Short clock helpers for the HUD clock card. */
export function formatClockTime(ms: number): string {
  const d = new Date(ms)
  const p = (v: number) => String(v).padStart(2, '0')
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
}

export function formatClockDate(ms: number): string {
  const d = new Date(ms)
  const p = (v: number) => String(v).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} UTC`
}
