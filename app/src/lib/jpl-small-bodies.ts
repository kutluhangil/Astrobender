import { validateEvidenceRecord, type EvidenceRecord } from './scientific-evidence.ts'

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
  evidence: EvidenceRecord
}

// No query string: the proxy hardcodes the upstream query and rejects
// parameters, so every client hits the same CDN-cacheable URL.
export const JPL_CAD_API_URL = '/api/jpl-cad'
export const JPL_CAD_SOURCE_URL = 'https://ssd-api.jpl.nasa.gov/cad.api'

export function getJplCadEvidence(retrievedAt: number): EvidenceRecord {
  if (!Number.isFinite(retrievedAt) || retrievedAt <= 0) {
    throw new Error(`JPL CAD evidence requires a valid retrieval timestamp; received ${retrievedAt}`)
  }
  return validateEvidenceRecord({
    evidenceClass: 'live',
    publisher: 'NASA/JPL',
    sourceUrl: JPL_CAD_SOURCE_URL,
    retrievedAt: new Date(retrievedAt).toISOString(),
    verifiedAt: '2026-07-26',
    uncertainty: 'Minimum and maximum distances are shown only when JPL publishes them.',
    limitation: 'A failed refresh retains the last valid payload with this original retrieval time.',
  })
}

const NAMED_SMALL_BODY_DATA: Omit<NamedSmallBody, 'evidence'>[] = [
  {
    id: 'ceres',
    name: 'Ceres',
    nameTr: 'Ceres',
    kind: 'dwarf-planet',
    summaryTr: 'Asteroit kuşağının en büyük cismi ve iç Güneş Sistemi’nin tek cüce gezegenidir.',
    sourceUrl: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=1',
  },
  {
    id: 'vesta',
    name: 'Vesta',
    nameTr: 'Vesta',
    kind: 'asteroid',
    summaryTr: 'Dawn görevinin ziyaret ettiği, dev Rheasilvia çarpma havzasına sahip protoplanettir.',
    sourceUrl: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=4',
  },
  {
    id: 'eros',
    name: '433 Eros',
    nameTr: '433 Eros',
    kind: 'asteroid',
    summaryTr: 'NEAR Shoemaker’ın yörüngeye girdiği ve yüzeyine indiği yakın Dünya asteroididir.',
    sourceUrl: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=433',
  },
  {
    id: 'bennu',
    name: '101955 Bennu',
    nameTr: 'Bennu',
    kind: 'asteroid',
    summaryTr: 'OSIRIS-REx’in örnek getirerek erken Güneş Sistemi maddesini incelememizi sağladığı asteroittir.',
    sourceUrl: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=101955',
  },
  {
    id: 'ryugu',
    name: '162173 Ryugu',
    nameTr: 'Ryugu',
    kind: 'asteroid',
    summaryTr: 'Hayabusa2’nin örnek getirdiği karbon bakımından zengin yakın Dünya asteroididir.',
    sourceUrl: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=162173',
  },
  {
    id: 'halley',
    name: '1P/Halley',
    nameTr: 'Halley Kuyruklu Yıldızı',
    kind: 'comet',
    summaryTr: 'Yaklaşık 76 yıllık yörüngesiyle çıplak gözle tekrar tekrar görülebilen periyodik kuyruklu yıldızdır.',
    sourceUrl: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=1P',
  },
  {
    id: '67p',
    name: '67P/Churyumov-Gerasimenko',
    nameTr: '67P/Çuryumov–Gerasimenko',
    kind: 'comet',
    summaryTr: 'Rosetta’nın yörüngesine girdiği ve Philae’nin yüzeyine indiği çift loblu kuyruklu yıldızdır.',
    sourceUrl: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=67P',
  },
]

export const NAMED_SMALL_BODIES: NamedSmallBody[] = NAMED_SMALL_BODY_DATA.map((body) => ({
  ...body,
  evidence: {
    evidenceClass: 'sourced-static',
    publisher: 'NASA/JPL',
    sourceUrl: body.sourceUrl,
    verifiedAt: '2026-07-26',
    uncertainty: 'Unknown where the JPL catalog record does not publish an uncertainty.',
    limitation: 'The panel summary is a reviewed, localized synopsis of the linked catalog record.',
  },
}))

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
