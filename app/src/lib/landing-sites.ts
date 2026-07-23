export interface LandingSite {
  id: string
  bodyId: 'earth' | 'moon' | 'mars' | 'venus' | 'titan'
  name: string
  nameTr: string
  year: number
  agency: string
  agencyTr: string
  lat: number
  lon: number
  emoji: string
  detailsTr: string
}

export const LANDING_SITES: LandingSite[] = [
  // 🌕 MOON
  {
    id: 'apollo11',
    bodyId: 'moon',
    name: 'Apollo 11 (Mare Tranquillitatis)',
    nameTr: 'Apollo 11 İniş Alanı',
    year: 1969,
    agency: 'NASA (USA)',
    agencyTr: 'NASA (ABD)',
    lat: 0.67,
    lon: 23.47,
    emoji: '🇺🇸',
    detailsTr: 'Neil Armstrong ve Buzz Aldrin\'in insanlık tarihinde Ay yüzeyine ilk ayak bastığı tarihi alan ("İnsan için küçük, insanlık için büyük bir adım").',
  },
  {
    id: 'apollo12',
    bodyId: 'moon',
    name: 'Apollo 12 (Oceanus Procellarum)',
    nameTr: 'Apollo 12 İniş Alanı',
    year: 1969,
    agency: 'NASA (USA)',
    agencyTr: 'NASA (ABD)',
    lat: -3.01,
    lon: -23.42,
    emoji: '🇺🇸',
    detailsTr: 'Pete Conrad ve Alan Bean tarafından Surveyor 3 uzay aracının yakınına hassas iniş yapıldığı görev.',
  },
  {
    id: 'apollo15',
    bodyId: 'moon',
    name: 'Apollo 15 (Hadley-Apennine)',
    nameTr: 'Apollo 15 İniş Alanı',
    year: 1971,
    agency: 'NASA (USA)',
    agencyTr: 'NASA (ABD)',
    lat: 26.13,
    lon: 3.63,
    emoji: '🇺🇸',
    detailsTr: 'İlk kez Ay Taşıtı (Lunar Roving Vehicle) sürülen ve Genesis taşının bulunduğu görev.',
  },
  {
    id: 'apollo17',
    bodyId: 'moon',
    name: 'Apollo 17 (Taurus-Littrow)',
    nameTr: 'Apollo 17 İniş Alanı',
    year: 1972,
    agency: 'NASA (USA)',
    agencyTr: 'NASA (ABD)',
    lat: 20.19,
    lon: 30.77,
    emoji: '🇺🇸',
    detailsTr: 'Eugene Cernan ve jeolog Harrison Schmitt\'in Ay yüzeyinde yürüdüğü son insanlı Apollo görevi.',
  },
  {
    id: 'change4',
    bodyId: 'moon',
    name: 'Chang\'e 4 (Von Kármán Crater)',
    nameTr: 'Chang\'e 4 (Ay\'ın Karanlık Yüzü)',
    year: 2019,
    agency: 'CNSA (China)',
    agencyTr: 'CNSA (Çin)',
    lat: -45.45,
    lon: 177.6,
    emoji: '🇨🇳',
    detailsTr: 'İnsanlık tarihinde Ay\'ın uzak/karanlık yüzüne (Far Side) yumuşak iniş yapan ilk uzay aracı ve Yutu-2 gezgini.',
  },

  // 🔴 MARS
  {
    id: 'perseverance',
    bodyId: 'mars',
    name: 'Perseverance & Ingenuity (Jezero Crater)',
    nameTr: 'Perseverance Gezgini & Ingenuity',
    year: 2021,
    agency: 'NASA (USA)',
    agencyTr: 'NASA (ABD)',
    lat: 18.38,
    lon: 77.58,
    emoji: '🤖',
    detailsTr: 'Eski göl yatağı Jezero Krateri\'nde antik yaşam izleri arayan nükleer enerjili gezgin ve Mars helikopteri Ingenuity.',
  },
  {
    id: 'curiosity',
    bodyId: 'mars',
    name: 'Curiosity Rover (Gale Crater)',
    nameTr: 'Curiosity Gezgini',
    year: 2012,
    agency: 'NASA (USA)',
    agencyTr: 'NASA (ABD)',
    lat: -4.58,
    lon: 137.44,
    emoji: '🚙',
    detailsTr: 'Gale Krateri ve Sharp Dağı eteklerinde Mars\'ın geçmişte mikrobiyel yaşama elverişli olduğunu kanıtlayan gezgin.',
  },
  {
    id: 'viking1',
    bodyId: 'mars',
    name: 'Viking 1 Lander (Chryse Planitia)',
    nameTr: 'Viking 1 İniş Aracı',
    year: 1976,
    agency: 'NASA (USA)',
    agencyTr: 'NASA (ABD)',
    lat: 22.48,
    lon: -47.97,
    emoji: '📡',
    detailsTr: 'Mars yüzeyine başarıyla inen ve ilk yüksek çözünürlüklü renkli fotoğrafları Dünya\'ya gönderen tarihi iniş aracı.',
  },
  {
    id: 'zhurong',
    bodyId: 'mars',
    name: 'Zhurong Rover (Utopia Planitia)',
    nameTr: 'Zhurong Gezgini',
    year: 2021,
    agency: 'CNSA (China)',
    agencyTr: 'CNSA (Çin)',
    lat: 25.06,
    lon: 109.92,
    emoji: '🇨🇳',
    detailsTr: 'Çin\'in Tianwen-1 görevi kapsamında Utopia Planitia düzlüğüne indirdiği ilk Mars gezgini.',
  },

  // 🪐 TITAN
  {
    id: 'huygens',
    bodyId: 'titan',
    name: 'Huygens Probe (Adiri Region)',
    nameTr: 'Huygens Sondası',
    year: 2005,
    agency: 'ESA / NASA',
    agencyTr: 'ESA (Avrupa) / NASA',
    lat: -10.2,
    lon: 192.4,
    emoji: '🛰️',
    detailsTr: 'Cassini uzay aracından ayrılarak Satürn\'ün dev uydusu Titan\'ın organik atmosferinden süzülüp inen, dış Güneş Sistemi\'ndeki ilk yüzey aracı.',
  },

  // 🟡 VENUS
  {
    id: 'venera13',
    bodyId: 'venus',
    name: 'Venera 13 (Phoebe Regio)',
    nameTr: 'Venera 13 Sondası',
    year: 1982,
    agency: 'Soviet Space Program',
    agencyTr: 'Sovyetler Birliği (SSCB)',
    lat: -7.5,
    lon: 303.0,
    emoji: '🔴',
    detailsTr: '457°C sıcaklık ve 89 atmosfer basınç altındaki Venüs yüzeyinde 127 dakika hayatta kalıp ilk renkli yüzey fotoğraflarını çeken efsanevi Sovyet sondası.',
  },
]

export function findLandingSiteNear(bodyId: string, lat: number, lon: number, radiusThreshold = 15.0): LandingSite | null {
  for (const s of LANDING_SITES) {
    if (s.bodyId === bodyId) {
      const dLat = Math.abs(s.lat - lat)
      const dLon = Math.abs(s.lon - lon)
      if (dLat < radiusThreshold && dLon < radiusThreshold) {
        return s
      }
    }
  }
  return null
}
