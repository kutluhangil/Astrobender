import type { PlanetaryBodyId } from './orbital-mechanics.ts'

export const JPL_SBDB_LOOKUP = 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr='

export interface CometDefinition {
  /** Also the key into PLANETARY_ELEMENTS. */
  id: Extract<PlanetaryBodyId, 'halley' | 'churyumov-gerasimenko' | 'pons-brooks'>
  designation: string
  name: string
  nameTr: string
  /** Mean nucleus radius in kilometres, or null where JPL publishes no size. */
  nucleusRadiusKm: number | null
  perihelionAu: number
  aphelionAu: number
  periodYears: number
  inclinationDeg: number
  eccentricity: number
  /** Epoch of the SBDB solution these elements were re-anchored from. */
  solutionEpoch: string
  /**
   * Distance between this two-body track and the JPL Horizons vector on
   * 2026-08-19, in au. Comet solutions are fitted per apparition and comets
   * carry non-gravitational outgassing forces, so the track is an orbit shape,
   * not an ephemeris — this number says by how much.
   */
  horizonsDriftAu: number
  summaryTr: string
  summaryEn: string
  sourceUrl: string
}

export const COMET_DRIFT_REFERENCE_DATE = '2026-08-19'

export const COMETS: readonly CometDefinition[] = [
  {
    id: 'halley',
    designation: '1P/Halley',
    name: 'Halley',
    nameTr: 'Halley',
    nucleusRadiusKm: 5.5,
    perihelionAu: 0.5749,
    aphelionAu: 35.28,
    periodYears: 75.92,
    inclinationDeg: 162.19,
    eccentricity: 0.96794,
    solutionEpoch: '1968-02-21',
    horizonsDriftAu: 0.183,
    summaryTr:
      'Ters yönde dolanan, çıplak gözle tekrar tekrar görülmüş tek kısa periyotlu kuyruklu yıldızdır. Orionid ve Eta Aquariid meteor yağmurlarını besler.',
    summaryEn:
      'The only short-period comet repeatedly seen with the naked eye, on a retrograde orbit. It feeds the Orionid and Eta Aquariid meteor showers.',
    sourceUrl: `${JPL_SBDB_LOOKUP}1P`,
  },
  {
    id: 'churyumov-gerasimenko',
    designation: '67P/Churyumov-Gerasimenko',
    name: 'Churyumov-Gerasimenko',
    nameTr: 'Çuryumov–Gerasimenko',
    nucleusRadiusKm: 1.7,
    perihelionAu: 1.2432,
    aphelionAu: 5.681,
    periodYears: 6.44,
    inclinationDeg: 7.04,
    eccentricity: 0.64091,
    solutionEpoch: '2015-10-10',
    horizonsDriftAu: 0.276,
    summaryTr:
      'Rosetta’nın yörüngesine girdiği, Philae’nin yüzeyine indiği çift loblu kuyruklu yıldızdır. Yoğunluğu 0.533 g/cm³ ile sudan çok düşüktür.',
    summaryEn:
      'The double-lobed comet Rosetta orbited and Philae landed on. Its 0.533 g/cm³ bulk density is far below water.',
    sourceUrl: `${JPL_SBDB_LOOKUP}67P`,
  },
  {
    id: 'pons-brooks',
    designation: '12P/Pons-Brooks',
    name: 'Pons-Brooks',
    nameTr: 'Pons–Brooks',
    nucleusRadiusKm: null,
    perihelionAu: 0.7809,
    aphelionAu: 33.59,
    periodYears: 71.24,
    inclinationDeg: 74.19,
    eccentricity: 0.95456,
    solutionEpoch: '2023-09-13',
    horizonsDriftAu: 0.003,
    summaryTr:
      'Ani parlama patlamalarıyla tanınan kriyovolkanik bir kuyruklu yıldızdır; en son 2024’te günberisinden geçti.',
    summaryEn:
      'A cryovolcanic comet known for sudden outbursts in brightness; its most recent perihelion was in 2024.',
    sourceUrl: `${JPL_SBDB_LOOKUP}12P`,
  },
]

export function findComet(id: string): CometDefinition | undefined {
  return COMETS.find((comet) => comet.id === id)
}

/**
 * Comet nuclei are a few kilometres across — a hundred-thousandth of the scene
 * unit an inner planet occupies — so they are never drawn to scale. This is the
 * marker radius used instead, kept identical for all three so no comet looks
 * larger than another.
 */
export const COMET_MARKER_RADIUS = 0.05
