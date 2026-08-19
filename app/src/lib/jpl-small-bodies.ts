import type { CelestialBodyId } from './planets.ts'

export interface CloseApproach {
  designation: string
  fullName: string
  closeApproachDate: string
  distanceAu: number
  minimumDistanceAu: number | null
  maximumDistanceAu: number | null
  relativeVelocityKmS: number
  diameterKm: number | null
  sourceUrl: string
}

export interface NamedSmallBody {
  id: string
  name: string
  nameTr: string
  kind: 'dwarf-planet' | 'asteroid' | 'comet'
  summaryTr: string
  sourceUrl: string
  /** Set when the body is also modelled in the 3D scene and can be focused. */
  bodyId?: CelestialBodyId
  /** SBDB primary designations that a JPL CAD row may use for this body. */
  designations: readonly string[]
}

// No query string: the proxy hardcodes the upstream query and rejects
// parameters, so every client hits the same CDN-cacheable URL.
export const JPL_CAD_API_URL = '/api/jpl-cad'
export const JPL_CAD_SOURCE_URL = 'https://ssd-api.jpl.nasa.gov/cad.api'

const SBDB = (designation: string) =>
  `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(designation)}`

export const NAMED_SMALL_BODIES: NamedSmallBody[] = [
  {
    id: 'ceres',
    name: 'Ceres',
    nameTr: 'Ceres',
    kind: 'dwarf-planet',
    summaryTr: 'Asteroit kuşağının en büyük cismi ve iç Güneş Sistemi’nin tek cüce gezegenidir.',
    sourceUrl: SBDB('1'),
    bodyId: 'ceres',
    designations: ['1', '1 Ceres', 'Ceres'],
  },
  {
    id: 'pallas',
    name: '2 Pallas',
    nameTr: '2 Pallas',
    kind: 'asteroid',
    summaryTr: 'Ana kuşağın en eğik yörüngeli büyük cismidir; kuşak düzleminin çok dışına çıkar.',
    sourceUrl: SBDB('2'),
    bodyId: 'pallas',
    designations: ['2', '2 Pallas', 'Pallas'],
  },
  {
    id: 'juno',
    name: '3 Juno',
    nameTr: '3 Juno',
    kind: 'asteroid',
    summaryTr: 'Keşfedilen üçüncü asteroittir ve taşsı S tipi cisimlerin en büyüklerinden biridir.',
    sourceUrl: SBDB('3'),
    bodyId: 'juno',
    designations: ['3', '3 Juno', 'Juno'],
  },
  {
    id: 'vesta',
    name: '4 Vesta',
    nameTr: '4 Vesta',
    kind: 'asteroid',
    summaryTr: 'Dawn görevinin ziyaret ettiği, dev Rheasilvia çarpma havzasına sahip protoplanettir.',
    sourceUrl: SBDB('4'),
    bodyId: 'vesta',
    designations: ['4', '4 Vesta', 'Vesta'],
  },
  {
    id: 'hygiea',
    name: '10 Hygiea',
    nameTr: '10 Hygiea',
    kind: 'asteroid',
    summaryTr: 'Ana kuşağın dördüncü büyük cismi ve karbonca zengin C tipi ailesinin en büyük üyesidir.',
    sourceUrl: SBDB('10'),
    bodyId: 'hygiea',
    designations: ['10', '10 Hygiea', 'Hygiea'],
  },
  {
    id: 'psyche',
    name: '16 Psyche',
    nameTr: '16 Psyche',
    kind: 'asteroid',
    summaryTr: 'Metalce zengin yapısıyla NASA’nın Psyche görevinin hedefidir.',
    sourceUrl: SBDB('16'),
    bodyId: 'psyche',
    designations: ['16', '16 Psyche', 'Psyche'],
  },
  {
    id: 'quaoar',
    name: '50000 Quaoar',
    nameTr: '50000 Quaoar',
    kind: 'dwarf-planet',
    summaryTr: 'Roche sınırının dışında iki halkası bulunan Kuiper Kuşağı cismidir.',
    sourceUrl: SBDB('50000'),
    bodyId: 'quaoar',
    designations: ['50000', '50000 Quaoar', 'Quaoar'],
  },
  {
    id: 'gonggong',
    name: '225088 Gonggong',
    nameTr: '225088 Gonggong',
    kind: 'dwarf-planet',
    summaryTr: 'Kütlesi ve yoğunluğu uydusu Xiangliu’nun yörüngesinden ölçülen dağınık disk cismidir.',
    sourceUrl: SBDB('225088'),
    bodyId: 'gonggong',
    designations: ['225088', '225088 Gonggong', 'Gonggong'],
  },
  {
    id: 'sedna',
    name: '90377 Sedna',
    nameTr: '90377 Sedna',
    kind: 'dwarf-planet',
    summaryTr: 'Günberisi 76 AU olan, iç Oort Bulutu’nun kanıtı sayılan uzak cisimdir.',
    sourceUrl: SBDB('90377'),
    bodyId: 'sedna',
    designations: ['90377', '90377 Sedna', 'Sedna'],
  },
  {
    id: 'eros',
    name: '433 Eros',
    nameTr: '433 Eros',
    kind: 'asteroid',
    summaryTr: 'NEAR Shoemaker’ın yörüngeye girdiği ve yüzeyine indiği yakın Dünya asteroididir.',
    sourceUrl: SBDB('433'),
    designations: ['433', '433 Eros', 'Eros'],
  },
  {
    id: 'bennu',
    name: '101955 Bennu',
    nameTr: 'Bennu',
    kind: 'asteroid',
    summaryTr: 'OSIRIS-REx’in örnek getirerek erken Güneş Sistemi maddesini incelememizi sağladığı asteroittir.',
    sourceUrl: SBDB('101955'),
    designations: ['101955', '101955 Bennu', 'Bennu'],
  },
  {
    id: 'ryugu',
    name: '162173 Ryugu',
    nameTr: 'Ryugu',
    kind: 'asteroid',
    summaryTr: 'Hayabusa2’nin örnek getirdiği karbon bakımından zengin yakın Dünya asteroididir.',
    sourceUrl: SBDB('162173'),
    designations: ['162173', '162173 Ryugu', 'Ryugu'],
  },
  {
    id: 'apophis',
    name: '99942 Apophis',
    nameTr: '99942 Apophis',
    kind: 'asteroid',
    summaryTr: '13 Nisan 2029’da jeosenkron uyduların altından geçecek olan yakın Dünya asteroididir.',
    sourceUrl: SBDB('99942'),
    designations: ['99942', '99942 Apophis', 'Apophis'],
  },
  {
    id: 'halley',
    name: '1P/Halley',
    nameTr: 'Halley Kuyruklu Yıldızı',
    kind: 'comet',
    summaryTr: 'Yaklaşık 76 yıllık yörüngesiyle çıplak gözle tekrar tekrar görülebilen periyodik kuyruklu yıldızdır.',
    sourceUrl: SBDB('1P'),
    designations: ['1P', '1P/Halley'],
  },
  {
    id: '67p',
    name: '67P/Churyumov-Gerasimenko',
    nameTr: '67P/Çuryumov–Gerasimenko',
    kind: 'comet',
    summaryTr: 'Rosetta’nın yörüngesine girdiği ve Philae’nin yüzeyine indiği çift loblu kuyruklu yıldızdır.',
    sourceUrl: SBDB('67P'),
    designations: ['67P', '67P/Churyumov-Gerasimenko'],
  },
]

const NAMED_BODY_BY_DESIGNATION = new Map<string, NamedSmallBody>(
  NAMED_SMALL_BODIES.flatMap((body) =>
    body.designations.map((designation) => [designation.toUpperCase(), body] as const),
  ),
)

const CAD_MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
}

/**
 * JPL CAD stamps its close-approach date as `YYYY-Mon-DD HH:MM` in TDB. It is
 * parsed explicitly because `Date.parse` treats that shape as implementation
 * defined and silently returns NaN in some engines.
 */
export function closeApproachTimeMs(closeApproachDate: string): number {
  const match = closeApproachDate
    .trim()
    .match(/^(\d{4})-([A-Za-z]{3})-(\d{2})(?:\s+(\d{2}):(\d{2}))?$/)
  if (!match) {
    throw new Error(`Unrecognized JPL CAD close-approach date: ${closeApproachDate}`)
  }
  const month = CAD_MONTHS[match[2].toUpperCase()]
  if (month === undefined) {
    throw new Error(`Unrecognized month in JPL CAD date: ${closeApproachDate}`)
  }
  return Date.UTC(
    Number(match[1]),
    month,
    Number(match[3]),
    Number(match[4] ?? '0'),
    Number(match[5] ?? '0'),
  )
}

/** Links a live close approach to the catalogued body it belongs to, if any. */
export function resolveApproachBody(approach: CloseApproach): NamedSmallBody | null {
  const candidates = [approach.designation, approach.fullName.replace(/\s*\(.*\)\s*$/, '')]
  for (const candidate of candidates) {
    const match = NAMED_BODY_BY_DESIGNATION.get(candidate.trim().toUpperCase())
    if (match) return match
  }
  return null
}

export interface CloseApproachHighlight {
  approach: CloseApproach
  timeMs: number
  namedBody: NamedSmallBody | null
}

/**
 * Orders the live feed by approach time and drops rows already in the past, so
 * the panel headline is genuinely "what is coming", not "what JPL returned".
 */
export function upcomingCloseApproaches(
  approaches: CloseApproach[],
  nowMs: number,
): CloseApproachHighlight[] {
  if (!Number.isFinite(nowMs)) throw new Error(`Invalid reference time: ${nowMs}`)
  return approaches
    .map((approach) => ({
      approach,
      timeMs: closeApproachTimeMs(approach.closeApproachDate),
      namedBody: resolveApproachBody(approach),
    }))
    .filter((highlight) => highlight.timeMs >= nowMs)
    .sort((left, right) => left.timeMs - right.timeMs)
}

/** Lunar distances make a 0.0026 au pass legible; 1 LD is the mean Earth-Moon distance. */
export const LUNAR_DISTANCE_AU = 0.00256955529

export function lunarDistances(distanceAu: number): number {
  if (!Number.isFinite(distanceAu) || distanceAu < 0) {
    throw new Error(`Close-approach distance must be a finite non-negative AU value: ${distanceAu}`)
  }
  return distanceAu / LUNAR_DISTANCE_AU
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseCloseApproaches(payload: unknown): CloseApproach[] {
  if (!isRecord(payload) || !Array.isArray(payload.fields) || !Array.isArray(payload.data)) {
    throw new Error('JPL CAD response must contain fields and data arrays')
  }
  const fields = payload.fields.map(String)
  const required = ['des', 'cd', 'dist', 'v_rel']
  const missing = required.filter((field) => !fields.includes(field))
  if (missing.length > 0) {
    throw new Error(`JPL CAD response is missing required fields: ${missing.join(', ')}`)
  }
  const fieldIndex = Object.fromEntries(fields.map((field, index) => [field, index]))
  const approaches: CloseApproach[] = []
  for (const row of payload.data) {
    if (!Array.isArray(row)) continue
    const designation = String(row[fieldIndex.des] ?? '')
    const closeApproachDate = String(row[fieldIndex.cd] ?? '')
    const distanceAu = Number(row[fieldIndex.dist])
    const relativeVelocityKmS = Number(row[fieldIndex.v_rel])
    if (!designation || !closeApproachDate || !Number.isFinite(distanceAu) || !Number.isFinite(relativeVelocityKmS)) {
      continue
    }
    approaches.push({
      designation,
      fullName: String(row[fieldIndex.fullname] ?? designation).trim() || designation,
      closeApproachDate,
      distanceAu,
      minimumDistanceAu: parseOptionalNumber(row[fieldIndex.dist_min]),
      maximumDistanceAu: parseOptionalNumber(row[fieldIndex.dist_max]),
      relativeVelocityKmS,
      diameterKm: parseOptionalNumber(row[fieldIndex.diameter]),
      sourceUrl: JPL_CAD_SOURCE_URL,
    })
  }
  return approaches
}

export async function fetchJplCloseApproaches(signal: AbortSignal): Promise<CloseApproach[]> {
  const response = await fetch(JPL_CAD_API_URL, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    const body = (await response.text()).replace(/\s+/g, ' ').slice(0, 180)
    throw new Error(
      `JPL CAD request returned HTTP ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`,
    )
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    throw new Error(
      `JPL CAD returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  return parseCloseApproaches(payload)
}
