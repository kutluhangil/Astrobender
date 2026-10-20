export interface DeepSpaceProbe {
  id: string
  name: string
  nameTr: string
  emoji: string
  launchYear: number
  targetBodyId: string
  statusTr: string
  statusEn: string
  descriptionTr: string
  sourceUrl: string
  rendered: boolean
  ephemerisNoteTr: string
}

// Positions and distances come from the baked JPL Horizons table in
// probe-ephemeris.ts; nothing here carries a hand-typed distance that could age.

export const DEEP_SPACE_PROBES: DeepSpaceProbe[] = [
  {
    id: 'voyager1',
    name: 'Voyager 1',
    nameTr: 'Voyager 1',
    emoji: '🛰️',
    launchYear: 1977,
    targetBodyId: 'sun',
    statusTr: 'Yıldızlararası Uzayda (Interstellar Space)',
    statusEn: 'In interstellar space',
    descriptionTr: 'İnsanlık tarihinin Dünya\'dan en uzağa ulaşmış yapay nesnesidir. Üzerinde Altın Plak (Golden Record) taşır.',
    sourceUrl: 'https://science.nasa.gov/mission/voyager/',
    rendered: true,
    ephemerisNoteTr: 'JPL Horizons vektör tablosundan gerçek konum.',
  },
  {
    id: 'voyager2',
    name: 'Voyager 2',
    nameTr: 'Voyager 2',
    emoji: '🛰️',
    launchYear: 1977,
    targetBodyId: 'sun',
    statusTr: 'Yıldızlararası Uzayda (Interstellar Space)',
    statusEn: 'In interstellar space',
    descriptionTr: 'Jüpiter, Satürn, Uranüs ve Neptün\'ün dördünü de ziyaret etmiş tek uzay aracıdır.',
    sourceUrl: 'https://science.nasa.gov/mission/voyager/',
    rendered: true,
    ephemerisNoteTr: 'JPL Horizons vektör tablosundan gerçek konum.',
  },
  {
    id: 'jwst',
    name: 'James Webb Space Telescope (JWST)',
    nameTr: 'James Webb Uzay Teleskobu',
    emoji: '🔭',
    launchYear: 2021,
    targetBodyId: 'earth',
    statusTr: 'L2 Lagrange Noktasında Aktif',
    statusEn: 'Operating at Sun-Earth L2',
    descriptionTr: 'İnsanlığın inşa ettiği en güçlü kızılötesi uzay teleskobudur. İlk galaksileri gözlemler.',
    sourceUrl: 'https://science.nasa.gov/mission/webb/',
    rendered: true,
    ephemerisNoteTr: 'JPL Horizons vektör tablosundan gerçek konum.',
  },
  {
    id: 'newhorizons',
    name: 'New Horizons',
    nameTr: 'New Horizons',
    emoji: '🛸',
    launchYear: 2006,
    targetBodyId: 'pluto',
    statusTr: 'Kuiper Kuşağında İlerliyor',
    statusEn: 'Crossing the Kuiper Belt',
    descriptionTr: '2015 yılında Plüton\'a ilk yakın geçişi yapmış ve Plüton\'un kalp şeklindeki buzullarını fotoğraflamıştır.',
    sourceUrl: 'https://science.nasa.gov/mission/new-horizons/',
    rendered: true,
    ephemerisNoteTr: 'JPL Horizons vektör tablosundan gerçek konum.',
  },
  {
    id: 'europa-clipper',
    name: 'Europa Clipper',
    nameTr: 'Europa Clipper',
    emoji: '🛰️',
    launchYear: 2024,
    targetBodyId: 'europa',
    statusTr: 'Jüpiter Sistemine Seyir',
    statusEn: 'Cruising to the Jupiter system',
    descriptionTr: 'Europa’nın yaşanabilirlik koşullarını incelemek üzere 2030’da Jüpiter sistemine ulaşması planlanıyor.',
    sourceUrl: 'https://science.nasa.gov/mission/europa-clipper/',
    rendered: true,
    ephemerisNoteTr: 'JPL Horizons vektör tablosundan gerçek konum.',
  },
  {
    id: 'juno',
    name: 'Juno',
    nameTr: 'Juno',
    emoji: '🛰️',
    launchYear: 2011,
    targetBodyId: 'jupiter',
    // NASA funded the extended mission through September 2025 and does not
    // deorbit Juno; its orbit decays until Jupiter's atmosphere claims it.
    statusTr: 'Uzatılmış görev Eylül 2025’te sona erdi',
    statusEn: 'Extended mission ended September 2025',
    descriptionTr: 'Jüpiter’in iç yapısını, atmosferini ve manyetik alanını kutupsal yörüngeden inceledi; NASA’ya göre bozulan yörüngesi sonunda aracı Jüpiter atmosferine düşürecek.',
    sourceUrl: 'https://science.nasa.gov/mission/juno/',
    rendered: true,
    ephemerisNoteTr: 'JPL Horizons vektör tablosundan gerçek konum.',
  },
  {
    id: 'parker-solar-probe',
    name: 'Parker Solar Probe',
    nameTr: 'Parker Solar Probe',
    emoji: '☀️',
    launchYear: 2018,
    targetBodyId: 'sun',
    statusTr: 'Güneş Yörüngesinde Aktif',
    statusEn: 'Orbiting the Sun',
    descriptionTr: 'Güneş koronasının içinden geçerek güneş rüzgârının kökenini araştırıyor.',
    sourceUrl: 'https://science.nasa.gov/mission/parker-solar-probe/',
    rendered: true,
    ephemerisNoteTr: 'JPL Horizons vektör tablosundan gerçek konum.',
  },
]
