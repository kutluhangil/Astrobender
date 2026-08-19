import {
  getHorizonsProbeRecord,
  horizonsDistanceAu,
  type HorizonsProbeRecord,
  type HorizonsVectorAu,
} from './horizons-records.ts'

export interface DeepSpaceProbe {
  id: string
  name: string
  nameTr: string
  emoji: string
  launchYear: number
  targetBodyId: string
  distanceAu: number
  angleRad: number
  inclinationRad: number
  speedKmS: number
  statusTr: string
  descriptionTr: string
  sourceUrl: string
  referenceEpochMs: number
  rendered: boolean
  /** A reviewed static source record; null means no 3D position is available. */
  ephemeris: HorizonsProbeRecord | null
  ephemerisNoteTr: string
}

const REFERENCE_EPOCH_MS = Date.UTC(2026, 0, 1)
const VOYAGER_1_RECORD = getHorizonsProbeRecord('voyager1')
if (!VOYAGER_1_RECORD) throw new Error('Reviewed Horizons record for Voyager 1 is required')

export function probePositionAu(probe: DeepSpaceProbe): HorizonsVectorAu {
  if (!probe.ephemeris) {
    throw new Error(`Probe ${probe.id} has no source-backed ephemeris record`)
  }
  return probe.ephemeris.positionAu
}

export function probeDistanceAuAt(probe: DeepSpaceProbe, timeMs: number): number {
  if (!Number.isFinite(timeMs)) throw new Error(`Invalid probe time: ${timeMs}`)
  if (!probe.ephemeris) {
    throw new Error(`Probe ${probe.id} has no source-backed ephemeris record for ${new Date(timeMs).toISOString()}`)
  }
  // This returns the reviewed vector's source-epoch distance. It never propagates
  // or extrapolates from the requested simulation time.
  return horizonsDistanceAu(probe.ephemeris)
}

export const DEEP_SPACE_PROBES: DeepSpaceProbe[] = [
  {
    id: 'voyager1',
    name: 'Voyager 1',
    nameTr: 'Voyager 1',
    emoji: '🛰️',
    launchYear: 1977,
    targetBodyId: 'sun',
    distanceAu: horizonsDistanceAu(VOYAGER_1_RECORD),
    angleRad: 0,
    inclinationRad: 0,
    speedKmS: 16.9,
    statusTr: 'Yıldızlararası Uzayda (Interstellar Space)',
    descriptionTr: 'İnsanlık tarihinin Dünya\'dan en uzağa ulaşmış yapay nesnesidir. Üzerinde Altın Plak (Golden Record) taşır.',
    sourceUrl: 'https://science.nasa.gov/mission/voyager/',
    referenceEpochMs: Date.parse('2026-08-13T00:00:00.000Z'),
    rendered: true,
    ephemeris: VOYAGER_1_RECORD,
    ephemerisNoteTr: 'JPL Horizons ICRF/TDB kaynak anlık görüntüsü gösterilir; ASTROBENDER bu konumu ileri veya geri yaymaz. Sınırlamayı kaynak ayrıntılarında inceleyin.',
  },
  {
    id: 'voyager2',
    name: 'Voyager 2',
    nameTr: 'Voyager 2',
    emoji: '🛰️',
    launchYear: 1977,
    targetBodyId: 'sun',
    distanceAu: 136.0,
    angleRad: 3.42,
    inclinationRad: -0.55,
    speedKmS: 15.3,
    statusTr: 'Yıldızlararası Uzayda (Interstellar Space)',
    descriptionTr: 'Jüpiter, Satürn, Uranüs ve Neptün\'ün dördünü de ziyaret etmiş tek uzay aracıdır.',
    sourceUrl: 'https://science.nasa.gov/mission/voyager/',
    referenceEpochMs: REFERENCE_EPOCH_MS,
    rendered: false,
    ephemeris: null,
    ephemerisNoteTr: 'Kaynaklı Horizons konum kaydı bulunmuyor; 3D konum kullanılamıyor.',
  },
  {
    id: 'jwst',
    name: 'James Webb Space Telescope (JWST)',
    nameTr: 'James Webb Uzay Teleskobu',
    emoji: '🔭',
    launchYear: 2021,
    targetBodyId: 'earth',
    distanceAu: 0.01, // L2 Point (~1.5M km from Earth)
    angleRad: -0.2,
    inclinationRad: 0.05,
    speedKmS: 0.2,
    statusTr: 'L2 Lagrange Noktasında Aktif',
    descriptionTr: 'İnsanlığın inşa ettiği en güçlü kızılötesi uzay teleskobudur. İlk galaksileri gözlemler.',
    sourceUrl: 'https://science.nasa.gov/mission/webb/',
    referenceEpochMs: REFERENCE_EPOCH_MS,
    rendered: false,
    ephemeris: null,
    ephemerisNoteTr: 'Kaynaklı Horizons konum kaydı bulunmuyor; 3D konum kullanılamıyor.',
  },
  {
    id: 'newhorizons',
    name: 'New Horizons',
    nameTr: 'New Horizons',
    emoji: '🛸',
    launchYear: 2006,
    targetBodyId: 'pluto',
    distanceAu: 58.0,
    angleRad: 4.12,
    inclinationRad: 0.12,
    speedKmS: 13.8,
    statusTr: 'Kuiper Kuşağında İlerliyor',
    descriptionTr: '2015 yılında Plüton\'a ilk yakın geçişi yapmış ve Plüton\'un kalp şeklindeki buzullarını fotoğraflamıştır.',
    sourceUrl: 'https://science.nasa.gov/mission/new-horizons/',
    referenceEpochMs: REFERENCE_EPOCH_MS,
    rendered: false,
    ephemeris: null,
    ephemerisNoteTr: 'Kaynaklı Horizons konum kaydı bulunmuyor; 3D konum kullanılamıyor.',
  },
  {
    id: 'europa-clipper',
    name: 'Europa Clipper',
    nameTr: 'Europa Clipper',
    emoji: '🛰️',
    launchYear: 2024,
    targetBodyId: 'europa',
    distanceAu: 2.4,
    angleRad: 0,
    inclinationRad: 0,
    speedKmS: 0,
    statusTr: 'Jüpiter Sistemine Seyir',
    descriptionTr: 'Europa’nın yaşanabilirlik koşullarını incelemek üzere 2030’da Jüpiter sistemine ulaşması planlanıyor.',
    sourceUrl: 'https://science.nasa.gov/mission/europa-clipper/',
    referenceEpochMs: REFERENCE_EPOCH_MS,
    rendered: false,
    ephemeris: null,
    ephemerisNoteTr: 'Kaynaklı Horizons konum kaydı bulunmuyor; 3D konum kullanılamıyor.',
  },
  {
    id: 'juno',
    name: 'Juno',
    nameTr: 'Juno',
    emoji: '🛰️',
    launchYear: 2011,
    targetBodyId: 'jupiter',
    distanceAu: 5.2,
    angleRad: 0,
    inclinationRad: 0,
    speedKmS: 0,
    statusTr: 'Jüpiter Yörüngesinde Aktif',
    descriptionTr: 'Jüpiter’in iç yapısını, atmosferini ve manyetik alanını kutupsal yörüngeden inceliyor.',
    sourceUrl: 'https://science.nasa.gov/mission/juno/',
    referenceEpochMs: REFERENCE_EPOCH_MS,
    rendered: false,
    ephemeris: null,
    ephemerisNoteTr: 'Kaynaklı Horizons konum kaydı bulunmuyor; 3D konum kullanılamıyor.',
  },
  {
    id: 'parker-solar-probe',
    name: 'Parker Solar Probe',
    nameTr: 'Parker Solar Probe',
    emoji: '☀️',
    launchYear: 2018,
    targetBodyId: 'sun',
    distanceAu: 0.3,
    angleRad: 0,
    inclinationRad: 0,
    speedKmS: 0,
    statusTr: 'Güneş Yörüngesinde Aktif',
    descriptionTr: 'Güneş koronasının içinden geçerek güneş rüzgârının kökenini araştırıyor.',
    sourceUrl: 'https://science.nasa.gov/mission/parker-solar-probe/',
    referenceEpochMs: REFERENCE_EPOCH_MS,
    rendered: false,
    ephemeris: null,
    ephemerisNoteTr: 'Kaynaklı Horizons konum kaydı bulunmuyor; 3D konum kullanılamıyor.',
  },
]
