// Satellite data model: legacy TLE and OMM parsing, validation, grouping.
//
// The catalog is merged from five CelesTrak feeds:
//   active                -> source-declared active catalog; displayed as Other
//   visual                -> source-declared Brightest layer (overrides active)
//   cosmos-2251-debris    -> Debris · Cosmos-2251
//   iridium-33-debris     -> Debris · Iridium-33
//   fengyun-1c-debris     -> Debris · Fengyun-1C
// Every object appears in exactly one layer; layer counts sum to the total.

import * as satellite from 'satellite.js'
import {
  getCelestrakFeedMetadata,
  type CelestrakGroupKey,
  type NormalizedOmmRecord,
} from './celestrak-omm.ts'
import type { OMMJsonObject } from 'satellite.js'

export interface SatInfo {
  name: string
  norad: number
  l1: string
  l2: string
  /** OMM records use json2satrec; bundled legacy snapshots keep this absent. */
  omm?: OMMJsonObject
  /** UI group index (see UI_GROUPS). */
  group: number
  /** TLE epoch as ms since Unix epoch. */
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

const GROUP_INDEX_BY_KEY: Readonly<Record<CelestrakGroupKey, number>> = Object.freeze({
  stations: G.Stations,
  gps: G.Gps,
  glonass: G.Glonass,
  galileo: G.Galileo,
  weather: G.Weather,
  oneweb: G.OneWeb,
  starlink: G.Starlink,
  brightest: G.Brightest,
  'debris-cosmos': G.DebrisCosmos,
  'debris-iridium': G.DebrisIridium,
  'debris-fengyun': G.DebrisFengyun,
  other: G.Other,
})

/** Parse the TLE epoch (line 1 columns 19-32: YYDDD.DDDDDDDD) to ms. */
export function tleEpochMs(l1: string): number {
  const yy = parseInt(l1.substring(18, 20), 10)
  const day = parseFloat(l1.substring(20, 32))
  if (!isFinite(yy) || !isFinite(day)) return 0
  const year = yy < 57 ? 2000 + yy : 1900 + yy
  return Date.UTC(year, 0, 1) + (day - 1) * 86400000
}

interface RawSat {
  name: string
  norad: number
  l1: string
  l2: string
  epochMs: number
  omm?: OMMJsonObject
}

function parse3le(text: string): RawSat[] {
  const lines = text.split(/\r?\n/)
  const out: RawSat[] = []
  let name = ''
  let l1 = ''
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith('1 ') && line.length >= 60) {
      l1 = line
    } else if (line.startsWith('2 ') && line.length >= 60 && l1) {
      const norad = parseInt(l1.substring(2, 7), 10)
      if (isFinite(norad)) {
        out.push({
          name: (name.trim() || `NORAD ${norad}`).replace(/\s+/g, ' '),
          norad,
          l1,
          l2: line,
          epochMs: tleEpochMs(l1),
        })
      }
      name = ''
      l1 = ''
    } else if (line.length > 0 && !line.startsWith('#')) {
      name = line
      l1 = ''
    }
  }
  return out
}

/** Texts of the five feeds; supplementals may be null if unavailable. */
export interface FeedTexts {
  active: string
  visual: string | null
  cosmos2251: string | null
  iridium33: string | null
  fengyun1c: string | null
}

/** Normalized CelesTrak OMM feeds; catalog IDs can be one through nine digits. */
export interface FeedOmmRecords {
  active: readonly NormalizedOmmRecord[]
  visual: readonly NormalizedOmmRecord[] | null
  cosmos2251: readonly NormalizedOmmRecord[] | null
  iridium33: readonly NormalizedOmmRecord[] | null
  fengyun1c: readonly NormalizedOmmRecord[] | null
}

function toSatInfo(record: RawSat, group: number): SatInfo {
  return { ...record, group }
}

function toOmmSatInfo(record: NormalizedOmmRecord): SatInfo {
  return {
    name: record.name,
    norad: record.norad,
    l1: '',
    l2: '',
    omm: record.omm,
    group: GROUP_INDEX_BY_KEY[record.groupKey],
    epochMs: record.epochMs,
  }
}

/**
 * Merge all feeds into validated, NORAD-deduplicated, group-sorted records.
 * Precedence: debris clouds first, then classified active objects, then the
 * visual feed overrides matched objects into the Brightest layer.
 */
export function mergeFeeds(feeds: FeedTexts): SatInfo[] {
  const byNorad = new Map<number, SatInfo>()

  const add = (r: RawSat, group: number, override: boolean) => {
    if (!override && byNorad.has(r.norad)) return
    byNorad.set(r.norad, toSatInfo(r, group))
  }

  for (const [text, feed] of [
    [feeds.cosmos2251, 'cosmos2251'],
    [feeds.iridium33, 'iridium33'],
    [feeds.fengyun1c, 'fengyun1c'],
  ] as const) {
    if (!text) continue
    const group = GROUP_INDEX_BY_KEY[getCelestrakFeedMetadata(feed).groupKey]
    for (const r of parse3le(text)) add(r, group, false)
  }

  const activeGroup = GROUP_INDEX_BY_KEY[getCelestrakFeedMetadata('active').groupKey]
  for (const r of parse3le(feeds.active)) add(r, activeGroup, false)

  if (feeds.visual) {
    const visualGroup = GROUP_INDEX_BY_KEY[getCelestrakFeedMetadata('visual').groupKey]
    for (const r of parse3le(feeds.visual)) add(r, visualGroup, true)
  }

  const sats = [...byNorad.values()]
  sats.sort((a, b) => a.group - b.group)
  return sats
}

/**
 * Merge validated OMM source groups. The source feed declares the taxonomy;
 * satellite-name heuristics are deliberately not used.
 */
export function mergeOmmFeeds(feeds: FeedOmmRecords): SatInfo[] {
  const byNorad = new Map<number, SatInfo>()
  const add = (record: NormalizedOmmRecord, override: boolean) => {
    if (!override && byNorad.has(record.norad)) return
    byNorad.set(record.norad, toOmmSatInfo(record))
  }
  for (const records of [feeds.cosmos2251, feeds.iridium33, feeds.fengyun1c]) {
    if (!records) continue
    for (const record of records) add(record, false)
  }
  for (const record of feeds.active) add(record, false)
  if (feeds.visual) {
    for (const record of feeds.visual) add(record, true)
  }
  const sats = [...byNorad.values()]
  sats.sort((a, b) => a.group - b.group || a.norad - b.norad)
  return sats
}

/** Create a satellite.js record from either an OMM or legacy TLE source record. */
export function createSgp4Record(satelliteInfo: SatInfo): satellite.SatRec {
  return satelliteInfo.omm
    ? satellite.json2satrec(satelliteInfo.omm)
    : satellite.twoline2satrec(satelliteInfo.l1, satelliteInfo.l2)
}

/** The active feed must parse to at least this many objects to be accepted. */
export const MIN_VALID_SATS = 1000

export function isValidTleText(text: string): boolean {
  if (!text || text.length < 1000) return false
  const l1 = text.indexOf('\n1 ')
  const l2 = text.indexOf('\n2 ')
  return (text.startsWith('1 ') || l1 >= 0) && l2 >= 0
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
