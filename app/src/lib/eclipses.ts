/**
 * Solar and lunar eclipses, copied from NASA GSFC's decade tables
 * (eclipse.gsfc.nasa.gov, Five Millennium Catalog). Times are Terrestrial
 * Dynamical Time as published, so they run roughly 70 s ahead of UTC.
 */

export const ECLIPSE_SOURCE_URLS = {
  solar: 'https://eclipse.gsfc.nasa.gov/SEdecade/SEdecade2021.html',
  lunar: 'https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html',
} as const

export type EclipseKind = 'solar' | 'lunar'
export type EclipseType = 'total' | 'annular' | 'partial' | 'penumbral'

export interface Eclipse {
  kind: EclipseKind
  type: EclipseType
  /** ISO date of greatest eclipse. */
  date: string
  /** Greatest eclipse, TD, HH:MM:SS. */
  timeTd: string
  magnitude: number
  /** Solar: central duration. Lunar: totality or partial phase length. Null when none applies. */
  duration: string | null
  regionTr: string
  regionEn: string
}

export const ECLIPSES: readonly Eclipse[] = [
  { kind: 'lunar', type: 'penumbral', date: '2027-02-20', timeTd: '23:14:06', magnitude: -0.057, duration: null, regionTr: 'Amerika, Avrupa, Afrika, Asya', regionEn: 'Americas, Europe, Africa, Asia' },
  { kind: 'solar', type: 'annular', date: '2027-02-06', timeTd: '16:00:47', magnitude: 0.928, duration: '7 dk 51 sn', regionTr: 'Güney Amerika, Antarktika, batı ve güney Afrika', regionEn: 'S. America, Antarctica, W & S Africa' },
  { kind: 'lunar', type: 'penumbral', date: '2027-07-18', timeTd: '16:04:09', magnitude: -1.068, duration: null, regionTr: 'Doğu Afrika, Asya, Avustralya, Pasifik', regionEn: 'E Africa, Asia, Australia, Pacific' },
  { kind: 'solar', type: 'total', date: '2027-08-02', timeTd: '10:07:49', magnitude: 1.079, duration: '6 dk 23 sn', regionTr: 'Afrika, Avrupa, Orta Doğu, batı ve güney Asya (Fas, İspanya, Mısır, Suudi Arabistan)', regionEn: 'Africa, Europe, Middle East, W & S Asia (Morocco, Spain, Egypt, Saudi Arabia)' },
  { kind: 'lunar', type: 'penumbral', date: '2027-08-17', timeTd: '07:14:59', magnitude: -0.525, duration: null, regionTr: 'Pasifik, Amerika', regionEn: 'Pacific, Americas' },
  { kind: 'lunar', type: 'partial', date: '2028-01-12', timeTd: '04:14:13', magnitude: 0.066, duration: '56 dk', regionTr: 'Amerika, Avrupa, Afrika', regionEn: 'Americas, Europe, Africa' },
  { kind: 'solar', type: 'annular', date: '2028-01-26', timeTd: '15:08:58', magnitude: 0.921, duration: '10 dk 27 sn', regionTr: 'Ekvador, Peru, Brezilya, Surinam, İspanya, Portekiz', regionEn: 'Ecuador, Peru, Brazil, Suriname, Spain, Portugal' },
  { kind: 'lunar', type: 'partial', date: '2028-07-06', timeTd: '18:20:57', magnitude: 0.389, duration: '2 sa 21 dk', regionTr: 'Avrupa, Afrika, Asya, Avustralya', regionEn: 'Europe, Africa, Asia, Australia' },
  { kind: 'solar', type: 'total', date: '2028-07-22', timeTd: '02:56:39', magnitude: 1.056, duration: '5 dk 10 sn', regionTr: 'Avustralya, Yeni Zelanda, Güneydoğu Asya', regionEn: 'Australia, New Zealand, SE Asia' },
  { kind: 'lunar', type: 'total', date: '2028-12-31', timeTd: '16:53:15', magnitude: 1.246, duration: '1 sa 11 dk', regionTr: 'Avrupa, Afrika, Asya, Avustralya, Pasifik', regionEn: 'Europe, Africa, Asia, Australia, Pacific' },
  { kind: 'solar', type: 'partial', date: '2029-01-14', timeTd: '17:13:47', magnitude: 0.871, duration: null, regionTr: 'Kuzey ve Orta Amerika', regionEn: 'N. & C. America' },
  { kind: 'solar', type: 'partial', date: '2029-06-12', timeTd: '04:06:13', magnitude: 0.458, duration: null, regionTr: 'Arktik, İskandinavya, Alaska, kuzey Asya', regionEn: 'Arctic, Scandinavia, Alaska, N Asia' },
  { kind: 'lunar', type: 'total', date: '2029-06-26', timeTd: '03:23:22', magnitude: 1.844, duration: '1 sa 42 dk', regionTr: 'Amerika, Avrupa, Afrika, Orta Doğu', regionEn: 'Americas, Europe, Africa, Middle East' },
  { kind: 'solar', type: 'partial', date: '2029-07-11', timeTd: '15:37:18', magnitude: 0.23, duration: null, regionTr: 'Güney Şili ve Arjantin', regionEn: 'S Chile, S Argentina' },
  { kind: 'solar', type: 'partial', date: '2029-12-05', timeTd: '15:03:57', magnitude: 0.891, duration: null, regionTr: 'Güney Arjantin, Şili, Antarktika', regionEn: 'S Argentina, S Chile, Antarctica' },
  { kind: 'lunar', type: 'total', date: '2029-12-20', timeTd: '22:43:12', magnitude: 1.117, duration: '54 dk', regionTr: 'Amerika, Avrupa, Afrika, Asya', regionEn: 'Americas, Europe, Africa, Asia' },
  { kind: 'solar', type: 'annular', date: '2030-06-01', timeTd: '06:29:13', magnitude: 0.944, duration: '5 dk 21 sn', regionTr: 'Avrupa, Kuzey Afrika, Orta Doğu, Asya (Cezayir, Yunanistan, Türkiye, Japonya)', regionEn: 'Europe, N Africa, Middle East, Asia (Algeria, Greece, Turkey, Japan)' },
  { kind: 'lunar', type: 'partial', date: '2030-06-15', timeTd: '18:34:34', magnitude: 0.502, duration: '2 sa 24 dk', regionTr: 'Avrupa, Afrika, Asya, Avustralya', regionEn: 'Europe, Africa, Asia, Australia' },
  { kind: 'solar', type: 'total', date: '2030-11-25', timeTd: '06:51:37', magnitude: 1.047, duration: '3 dk 44 sn', regionTr: 'Botsvana, Güney Afrika, Avustralya', regionEn: 'Botswana, S Africa, Australia' },
  { kind: 'lunar', type: 'penumbral', date: '2030-12-09', timeTd: '22:28:51', magnitude: -0.163, duration: null, regionTr: 'Amerika, Avrupa, Afrika, Asya', regionEn: 'Americas, Europe, Africa, Asia' },
]

export function upcomingEclipses(nowMs: number, limit = 8): Eclipse[] {
  return ECLIPSES.filter((eclipse) => Date.parse(`${eclipse.date}T23:59:59Z`) >= nowMs)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit)
}
