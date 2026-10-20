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
  /** Absolute magnitude H; JPL publishes it for nearly every row that lacks a diameter. */
  absoluteMagnitude: number | null
  sourceUrl: string
}

export type SmallBodyKind = 'dwarf-planet' | 'dwarf-planet-candidate' | 'asteroid' | 'comet'

const SMALL_BODY_KIND_LABELS: Record<SmallBodyKind, { tr: string; en: string }> = {
  'dwarf-planet': { tr: 'Cüce gezegen', en: 'Dwarf planet' },
  'dwarf-planet-candidate': { tr: 'Cüce gezegen adayı', en: 'Dwarf-planet candidate' },
  asteroid: { tr: 'Asteroit', en: 'Asteroid' },
  comet: { tr: 'Kuyruklu yıldız', en: 'Comet' },
}

export function smallBodyKindLabel(kind: SmallBodyKind, language: 'tr' | 'en'): string {
  return SMALL_BODY_KIND_LABELS[kind][language]
}

export interface NamedSmallBody {
  id: string
  name: string
  nameTr: string
  /** Only the five IAU-recognised dwarf planets carry 'dwarf-planet'. */
  kind: SmallBodyKind
  summaryTr: string
  summaryEn: string
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
    summaryEn: 'The largest body in the asteroid belt and the only dwarf planet in the inner Solar System.',
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
    summaryEn: 'The main-belt giant on the most inclined orbit, carrying it far above and below the belt plane.',
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
    summaryEn: 'The third asteroid ever discovered and one of the largest stony S-type bodies.',
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
    summaryEn: 'The protoplanet Dawn visited, scarred by the giant Rheasilvia impact basin.',
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
    summaryEn: 'The fourth-largest main-belt body and the largest of the carbon-rich C-type family.',
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
    summaryEn: 'A metal-rich world and the target of NASA’s Psyche mission.',
    sourceUrl: SBDB('16'),
    bodyId: 'psyche',
    designations: ['16', '16 Psyche', 'Psyche'],
  },
  {
    id: 'quaoar',
    name: '50000 Quaoar',
    nameTr: '50000 Quaoar',
    kind: 'dwarf-planet-candidate',
    summaryTr: 'Roche sınırının dışında iki halkası bulunan Kuiper Kuşağı cismidir.',
    summaryEn: 'A Kuiper Belt object with two rings orbiting outside its Roche limit.',
    sourceUrl: SBDB('50000'),
    bodyId: 'quaoar',
    designations: ['50000', '50000 Quaoar', 'Quaoar'],
  },
  {
    id: 'gonggong',
    name: '225088 Gonggong',
    nameTr: '225088 Gonggong',
    kind: 'dwarf-planet-candidate',
    summaryTr: 'Kütlesi ve yoğunluğu uydusu Xiangliu’nun yörüngesinden ölçülen dağınık disk cismidir.',
    summaryEn: 'A scattered-disc body whose mass and density were measured from the orbit of its moon Xiangliu.',
    sourceUrl: SBDB('225088'),
    bodyId: 'gonggong',
    designations: ['225088', '225088 Gonggong', 'Gonggong'],
  },
  {
    id: 'sedna',
    name: '90377 Sedna',
    nameTr: '90377 Sedna',
    kind: 'dwarf-planet-candidate',
    summaryTr: 'Günberisi 76 AU olan, iç Oort Bulutu’nun kanıtı sayılan uzak cisimdir.',
    summaryEn: 'A distant body with a 76 au perihelion, treated as evidence of an inner Oort Cloud.',
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
    summaryEn: 'The near-Earth asteroid NEAR Shoemaker orbited and then landed on.',
    sourceUrl: SBDB('433'),
    designations: ['433', '433 Eros', 'Eros'],
  },
  {
    id: 'bennu',
    name: '101955 Bennu',
    nameTr: 'Bennu',
    kind: 'asteroid',
    summaryTr: 'OSIRIS-REx’in örnek getirerek erken Güneş Sistemi maddesini incelememizi sağladığı asteroittir.',
    summaryEn: 'The asteroid OSIRIS-REx sampled, returning early Solar System material to Earth.',
    sourceUrl: SBDB('101955'),
    designations: ['101955', '101955 Bennu', 'Bennu'],
  },
  {
    id: 'ryugu',
    name: '162173 Ryugu',
    nameTr: 'Ryugu',
    kind: 'asteroid',
    summaryTr: 'Hayabusa2’nin örnek getirdiği karbon bakımından zengin yakın Dünya asteroididir.',
    summaryEn: 'The carbon-rich near-Earth asteroid Hayabusa2 sampled and returned to Earth.',
    sourceUrl: SBDB('162173'),
    designations: ['162173', '162173 Ryugu', 'Ryugu'],
  },
  {
    id: 'apophis',
    name: '99942 Apophis',
    nameTr: '99942 Apophis',
    kind: 'asteroid',
    summaryTr: '13 Nisan 2029’da jeosenkron uyduların altından geçecek olan yakın Dünya asteroididir.',
    summaryEn: 'A near-Earth asteroid that will pass inside the geostationary ring on April 13, 2029.',
    sourceUrl: SBDB('99942'),
    designations: ['99942', '99942 Apophis', 'Apophis'],
  },
  {
    id: 'halley',
    name: '1P/Halley',
    nameTr: 'Halley Kuyruklu Yıldızı',
    kind: 'comet',
    summaryTr: 'Yaklaşık 76 yıllık yörüngesiyle çıplak gözle tekrar tekrar görülebilen periyodik kuyruklu yıldızdır.',
    summaryEn: 'A periodic comet seen with the naked eye on each return of its roughly 76-year orbit.',
    sourceUrl: SBDB('1P'),
    designations: ['1P', '1P/Halley'],
  },
  {
    id: '67p',
    name: '67P/Churyumov-Gerasimenko',
    nameTr: '67P/Çuryumov–Gerasimenko',
    kind: 'comet',
    summaryTr: 'Rosetta’nın yörüngesine girdiği ve Philae’nin yüzeyine indiği çift loblu kuyruklu yıldızdır.',
    summaryEn: 'The double-lobed comet Rosetta orbited and Philae landed on.',
    sourceUrl: SBDB('67P'),
    designations: ['67P', '67P/Churyumov-Gerasimenko'],
  },
  {
    id: 'encke',
    name: '2P/Encke',
    nameTr: 'Encke Kuyruklu Yıldızı',
    kind: 'comet',
    summaryTr: 'Taurid meteor yağmurlarını besleyen, 3.3 yıllık yörüngesiyle en kısa periyotlu kuyruklu yıldızlardan biridir.',
    summaryEn: 'The parent of the Taurid meteor showers and one of the shortest-period comets, at 3.3 years.',
    sourceUrl: SBDB('2P'),
    designations: ['2P', '2P/Encke'],
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

/**
 * Size range implied by an absolute magnitude when no measured diameter exists,
 * using D = 1329 km / sqrt(albedo) * 10^(-H/5) over the 0.25 (bright) to 0.05
 * (dark) albedo span typical of near-Earth asteroids.
 */
export function diameterRangeFromAbsoluteMagnitude(absoluteMagnitude: number): { minKm: number; maxKm: number } {
  if (!Number.isFinite(absoluteMagnitude)) {
    throw new Error(`Absolute magnitude must be finite: ${absoluteMagnitude}`)
  }
  const scale = 1329 * 10 ** (-absoluteMagnitude / 5)
  return { minKm: scale / Math.sqrt(0.25), maxKm: scale / Math.sqrt(0.05) }
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
  // JPL omits the fields table entirely when nothing falls inside the window.
  if (isRecord(payload) && Number(payload.count) === 0 && payload.data === undefined) return []
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
      absoluteMagnitude: parseOptionalNumber(row[fieldIndex.h]),
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
