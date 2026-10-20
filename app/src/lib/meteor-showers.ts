import {
  Body,
  Equator,
  GeoVector,
  Horizon,
  Illumination,
  Observer,
  RotateVector,
  Rotation_EQJ_ECL,
} from 'astronomy-engine'

/**
 * The twelve major showers of the IMO working list. Maxima are stored as the
 * J2000 solar longitude the IMO calendar gives, not as calendar dates, because
 * a shower recurs at a fixed point of Earth's orbit: the date of that point
 * drifts by about six hours a year and jumps back each leap year. Computing it
 * per year keeps every future year correct instead of only the one a calendar
 * was copied from.
 *
 * Values agree between the IMO 2026 and 2027 calendars except where a
 * `zhrByYear` entry records a year-specific forecast.
 */
export interface MeteorShower {
  id: string
  /** IAU Meteor Data Center code. */
  code: string
  nameTr: string
  nameEn: string
  /** J2000 solar longitude of the maximum, degrees. */
  solarLongitude: number
  /** Activity window as [month, day] pairs; `from` may fall in the previous year. */
  activeFrom: readonly [number, number]
  activeTo: readonly [number, number]
  /** Radiant at maximum, J2000. */
  radiant: { raDeg: number; decDeg: number }
  /** Geocentric entry speed, km/s. */
  velocityKmS: number
  /** Zenithal hourly rate at maximum in an average year. */
  zhr: number
  /** IMO year-specific forecasts, kept as published ("110+"). */
  zhrByYear?: Readonly<Record<number, string>>
  parentBody: string
}

export const METEOR_SHOWERS: readonly MeteorShower[] = [
  {
    id: 'quadrantids', code: '010 QUA', nameTr: 'Quadrantidler', nameEn: 'Quadrantids',
    solarLongitude: 283.15, activeFrom: [12, 28], activeTo: [1, 12],
    radiant: { raDeg: 230, decDeg: 49 }, velocityKmS: 41, zhr: 80, zhrByYear: { 2027: '80+' },
    parentBody: '(196256) 2003 EH1',
  },
  {
    id: 'lyrids', code: '006 LYR', nameTr: 'Nisan Lyridleri', nameEn: 'April Lyrids',
    solarLongitude: 32.32, activeFrom: [4, 14], activeTo: [4, 30],
    radiant: { raDeg: 271, decDeg: 34 }, velocityKmS: 49, zhr: 18,
    parentBody: 'C/1861 G1 (Thatcher)',
  },
  {
    id: 'eta-aquariids', code: '031 ETA', nameTr: 'Eta Aquariidler', nameEn: 'Eta Aquariids',
    solarLongitude: 45.5, activeFrom: [4, 19], activeTo: [5, 28],
    radiant: { raDeg: 338, decDeg: -1 }, velocityKmS: 66, zhr: 50,
    parentBody: '1P/Halley',
  },
  {
    id: 'southern-delta-aquariids', code: '005 SDA', nameTr: 'Güney Delta Aquariidler', nameEn: 'Southern Delta Aquariids',
    solarLongitude: 128, activeFrom: [7, 12], activeTo: [8, 23],
    radiant: { raDeg: 340, decDeg: -16 }, velocityKmS: 41, zhr: 25,
    parentBody: '96P/Machholz',
  },
  {
    id: 'perseids', code: '007 PER', nameTr: 'Perseidler', nameEn: 'Perseids',
    solarLongitude: 140.0, activeFrom: [7, 17], activeTo: [8, 24],
    radiant: { raDeg: 48, decDeg: 58 }, velocityKmS: 59, zhr: 100, zhrByYear: { 2026: '100', 2027: '110+' },
    parentBody: '109P/Swift-Tuttle',
  },
  {
    id: 'draconids', code: '009 DRA', nameTr: 'Drakonidler', nameEn: 'Draconids',
    solarLongitude: 195.4, activeFrom: [10, 6], activeTo: [10, 10],
    radiant: { raDeg: 262, decDeg: 54 }, velocityKmS: 20, zhr: 5,
    parentBody: '21P/Giacobini-Zinner',
  },
  {
    id: 'orionids', code: '008 ORI', nameTr: 'Orionidler', nameEn: 'Orionids',
    solarLongitude: 208, activeFrom: [10, 2], activeTo: [11, 7],
    radiant: { raDeg: 95, decDeg: 16 }, velocityKmS: 66, zhr: 20,
    parentBody: '1P/Halley',
  },
  {
    id: 'southern-taurids', code: '002 STA', nameTr: 'Güney Tauridler', nameEn: 'Southern Taurids',
    solarLongitude: 223, activeFrom: [9, 20], activeTo: [11, 20],
    radiant: { raDeg: 52, decDeg: 15 }, velocityKmS: 27, zhr: 7,
    parentBody: '2P/Encke',
  },
  {
    id: 'northern-taurids', code: '017 NTA', nameTr: 'Kuzey Tauridler', nameEn: 'Northern Taurids',
    solarLongitude: 230, activeFrom: [10, 20], activeTo: [12, 10],
    radiant: { raDeg: 58, decDeg: 22 }, velocityKmS: 29, zhr: 5,
    parentBody: '2P/Encke',
  },
  {
    id: 'leonids', code: '013 LEO', nameTr: 'Leonidler', nameEn: 'Leonids',
    solarLongitude: 235.27, activeFrom: [11, 6], activeTo: [11, 30],
    radiant: { raDeg: 152, decDeg: 22 }, velocityKmS: 71, zhr: 15, zhrByYear: { 2027: '15+' },
    parentBody: '55P/Tempel-Tuttle',
  },
  {
    id: 'geminids', code: '004 GEM', nameTr: 'Geminidler', nameEn: 'Geminids',
    solarLongitude: 262.2, activeFrom: [12, 4], activeTo: [12, 20],
    radiant: { raDeg: 112, decDeg: 33 }, velocityKmS: 35, zhr: 150,
    parentBody: '(3200) Phaethon',
  },
  {
    id: 'ursids', code: '015 URS', nameTr: 'Ursidler', nameEn: 'Ursids',
    solarLongitude: 270.7, activeFrom: [12, 17], activeTo: [12, 26],
    radiant: { raDeg: 217, decDeg: 76 }, velocityKmS: 33, zhr: 10,
    parentBody: '8P/Tuttle',
  },
]

/**
 * IMO calendars by year. The IMO site was being rebuilt in October 2026: the
 * 2027 calendar is served from the site root and the 2026 one only survives in
 * the Internet Archive.
 */
const IMO_CALENDAR_URLS: Readonly<Record<number, string>> = {
  2026: 'https://web.archive.org/web/20260721074211/https://www.imo.net/files/meteor-shower/cal2026.pdf',
  2027: 'https://www.imo.net/ShCal27s.pdf',
}

export const IMO_HOME_URL = 'https://www.imo.net/'
export const IMO_FIREBALL_REPORT_URL = 'https://fireball.imo.net/'

export function imoCalendarUrl(year: number): string {
  return IMO_CALENDAR_URLS[year] ?? IMO_HOME_URL
}

export function showerZhrLabel(shower: MeteorShower, year: number): string {
  return shower.zhrByYear?.[year] ?? String(shower.zhr)
}

const DEGREES_PER_DAY = 360 / 365.2422
const DAY_MS = 86_400_000
const J2000_ECLIPTIC = Rotation_EQJ_ECL()

/** Geocentric solar longitude on the J2000 mean ecliptic, the frame IMO quotes. */
export function sunLongitudeJ2000(date: Date): number {
  const ecliptic = RotateVector(J2000_ECLIPTIC, GeoVector(Body.Sun, date, true))
  const degrees = (Math.atan2(ecliptic.y, ecliptic.x) * 180) / Math.PI
  return (degrees + 360) % 360
}

/** The instant the Sun reaches `longitude` (J2000) closest to `near`. */
export function searchSunLongitudeJ2000(longitude: number, near: Date): Date {
  let ms = near.getTime()
  for (let iteration = 0; iteration < 8; iteration++) {
    const delta = ((longitude - sunLongitudeJ2000(new Date(ms)) + 540) % 360) - 180
    ms += (delta / DEGREES_PER_DAY) * DAY_MS
    if (Math.abs(delta) < 1e-7) break
  }
  return new Date(ms)
}

/** First guess for the maximum in `year`, from the mean solar motion. */
function peakSearchStart(shower: MeteorShower, year: number): Date {
  // Mean J2000 longitude of the Sun at 00:00 UTC on 1 January is about 280°.
  const daysFromJanuary = (((shower.solarLongitude - 280.2) % 360) + 360) % 360 / DEGREES_PER_DAY
  return new Date(Date.UTC(year, 0, 1) + daysFromJanuary * DAY_MS)
}

export interface ShowerApparition {
  shower: MeteorShower
  year: number
  peakAt: Date
  activeStart: Date
  activeEnd: Date
  zhr: string
  sourceUrl: string
}

/** The apparition whose maximum falls in calendar `year`. */
export function showerApparition(shower: MeteorShower, year: number): ShowerApparition {
  const peakAt = searchSunLongitudeJ2000(shower.solarLongitude, peakSearchStart(shower, year))
  if (peakAt.getUTCFullYear() !== year) {
    throw new Error(`${shower.nameEn} maximum for ${year} resolved to ${peakAt.toISOString()}`)
  }
  const [fromMonth, fromDay] = shower.activeFrom
  const [toMonth, toDay] = shower.activeTo
  const startYear = fromMonth > toMonth && fromMonth > peakAt.getUTCMonth() + 1 ? year - 1 : year
  const endYear = fromMonth > toMonth && toMonth < peakAt.getUTCMonth() + 1 ? year + 1 : year
  return {
    shower,
    year,
    peakAt,
    activeStart: new Date(Date.UTC(startYear, fromMonth - 1, fromDay)),
    activeEnd: new Date(Date.UTC(endYear, toMonth - 1, toDay, 23, 59, 59, 999)),
    zhr: showerZhrLabel(shower, year),
    sourceUrl: imoCalendarUrl(year),
  }
}

export function findMeteorShower(id: string): MeteorShower {
  const shower = METEOR_SHOWERS.find((candidate) => candidate.id === id)
  if (!shower) throw new Error(`Unknown meteor shower: ${id}`)
  return shower
}

export function moonIlluminationPercent(date: Date): number {
  return Math.round(Illumination(Body.Moon, date).phase_fraction * 100)
}

export interface RadiantWindow {
  /** Highest radiant altitude while the Sun is below −12° within 12 h of the peak. */
  bestAltitudeDegrees: number
  bestAt: Date | null
}

/**
 * Best observing moment near a maximum: the radiant's highest altitude while
 * the Sun is at least 12° below the horizon, sampled every 20 minutes across
 * the 24 hours centred on the peak.
 */
export function bestRadiantWindow(
  shower: MeteorShower,
  peakAt: Date,
  latitude: number,
  longitude: number,
): RadiantWindow {
  const observer = new Observer(latitude, longitude, 0)
  const raHours = shower.radiant.raDeg / 15
  let bestAltitudeDegrees = -90
  let bestAt: Date | null = null
  for (let minutes = -12 * 60; minutes <= 12 * 60; minutes += 20) {
    const when = new Date(peakAt.getTime() + minutes * 60_000)
    const sunEquator = Equator(Body.Sun, when, observer, true, true)
    const sun = Horizon(when, observer, sunEquator.ra, sunEquator.dec, 'normal')
    if (sun.altitude > -12) continue
    const radiant = Horizon(when, observer, raHours, shower.radiant.decDeg, 'normal')
    if (radiant.altitude > bestAltitudeDegrees) {
      bestAltitudeDegrees = radiant.altitude
      bestAt = when
    }
  }
  return { bestAltitudeDegrees, bestAt }
}
