import {
  AngleBetween,
  AngleFromSun,
  ApsisKind,
  Body,
  EclipseKind,
  Equator,
  GeoMoon,
  GeoVector,
  Horizon,
  NextGlobalSolarEclipse,
  NextLunarApsis,
  NextLunarEclipse,
  NextMoonQuarter,
  Observer,
  SearchGlobalSolarEclipse,
  SearchLocalSolarEclipse,
  SearchLunarApsis,
  SearchLunarEclipse,
  SearchMaxElongation,
  SearchMoonQuarter,
  SearchRelativeLongitude,
} from 'astronomy-engine'
import {
  METEOR_SHOWERS,
  bestRadiantWindow,
  type RadiantWindow,
  moonIlluminationPercent,
  showerApparition,
} from './meteor-showers.ts'
import type { CelestialBodyId } from './planets.ts'
import type { UiLanguage } from './ui-language.ts'

export type SkyEventKind =
  | 'solar-eclipse'
  | 'lunar-eclipse'
  | 'meteor-shower'
  | 'maximum-elongation'
  | 'conjunction'
  | 'opposition'
  | 'moon-phase'
  | 'planet-pair'

export interface SkyObserver {
  latitude: number
  longitude: number
  label: string
}

export type SkyEventVisibility =
  | 'global'
  | 'local-visible'
  | 'local-not-visible'
  | 'location-required'

export interface SkyEvent {
  id: string
  kind: SkyEventKind
  startsAt: string
  endsAt: string | null
  title: string
  summary: string
  guidance: string
  sourceUrl: string
  targetBody: CelestialBodyId
  visibility: SkyEventVisibility
}

interface SkyEventInput {
  start: Date
  end: Date
  observer?: SkyObserver
  language: UiLanguage
}


const NASA_ECLIPSE_URL = 'https://science.nasa.gov/eclipses/future-eclipses/'
const NASA_MOON_PHASES_URL = 'https://science.nasa.gov/moon/moon-phases/'
const NASA_SUPERMOON_URL = 'https://science.nasa.gov/moon/supermoons/'
const AU_KM = 149_597_870.7
const JPL_PLANETS_URL = 'https://ssd.jpl.nasa.gov/planets/'


type PlanetBody =
  | Body.Mercury
  | Body.Venus
  | Body.Mars
  | Body.Jupiter
  | Body.Saturn
  | Body.Uranus
  | Body.Neptune

const BODY_INFO: Record<PlanetBody, {
  id: CelestialBodyId
  tr: string
  en: string
}> = {
  [Body.Mercury]: { id: 'mercury', tr: 'Merkür', en: 'Mercury' },
  [Body.Venus]: { id: 'venus', tr: 'Venüs', en: 'Venus' },
  [Body.Mars]: { id: 'mars', tr: 'Mars', en: 'Mars' },
  [Body.Jupiter]: { id: 'jupiter', tr: 'Jüpiter', en: 'Jupiter' },
  [Body.Saturn]: { id: 'saturn', tr: 'Satürn', en: 'Saturn' },
  [Body.Uranus]: { id: 'uranus', tr: 'Uranüs', en: 'Uranus' },
  [Body.Neptune]: { id: 'neptune', tr: 'Neptün', en: 'Neptune' },
}

const DAY_MS = 24 * 60 * 60 * 1000

function t(language: UiLanguage, tr: string, en: string): string {
  return language === 'tr' ? tr : en
}

function toIso(date: Date): string {
  return date.toISOString()
}

function containsDate(start: Date, end: Date, value: Date): boolean {
  return value.getTime() >= start.getTime() && value.getTime() <= end.getTime()
}

function eclipseLabel(kind: EclipseKind, language: UiLanguage): string {
  const labels: Record<EclipseKind, [string, string]> = {
    [EclipseKind.Total]: ['Tam', 'Total'],
    [EclipseKind.Partial]: ['Parçalı', 'Partial'],
    [EclipseKind.Annular]: ['Halkalı', 'Annular'],
    [EclipseKind.Penumbral]: ['Yarı gölgeli', 'Penumbral'],
  }
  return labels[kind][language === 'tr' ? 0 : 1]
}

function solarVisibility(globalPeak: Date, observer: SkyObserver | undefined): SkyEventVisibility {
  if (!observer) return 'location-required'
  // The local search looks for the next new moon after its start time, and that
  // new moon precedes the global peak, so starting at the peak skips the very
  // eclipse being described. Start a day early instead.
  const searchFrom = new Date(globalPeak.getTime() - 24 * 60 * 60 * 1000)
  const local = SearchLocalSolarEclipse(searchFrom, new Observer(observer.latitude, observer.longitude, 0))
  return Math.abs(local.peak.time.date.getTime() - globalPeak.getTime()) < 36 * 60 * 60 * 1000 && local.peak.altitude > 0
    ? 'local-visible'
    : 'local-not-visible'
}

function lunarVisibility(peak: Date, observer: SkyObserver | undefined): SkyEventVisibility {
  if (!observer) return 'location-required'
  const localObserver = new Observer(observer.latitude, observer.longitude, 0)
  const equatorial = Equator(Body.Moon, peak, localObserver, true, true)
  return Horizon(peak, localObserver, equatorial.ra, equatorial.dec, 'normal').altitude > 0
    ? 'local-visible'
    : 'local-not-visible'
}

function addSolarEclipses(input: SkyEventInput, events: SkyEvent[]) {
  let eclipse = SearchGlobalSolarEclipse(input.start)
  while (containsDate(input.start, input.end, eclipse.peak.date)) {
    const peak = eclipse.peak.date
    const type = eclipseLabel(eclipse.kind, input.language)
    events.push({
      id: `solar-eclipse-${peak.toISOString().slice(0, 10)}`,
      kind: 'solar-eclipse',
      startsAt: toIso(peak),
      endsAt: null,
      title: t(input.language, `${type} Güneş Tutulması`, `${type} Solar Eclipse`),
      summary: t(
        input.language,
        'Ay, Dünya’dan bakıldığında Güneş diskinin önünden geçer.',
        'The Moon passes in front of the Sun as seen from Earth.',
      ),
      guidance: t(
        input.language,
        'Güneşe yalnızca ISO 12312-2 uyumlu filtreyle bakın.',
        'View the Sun only with an ISO 12312-2 compliant solar filter.',
      ),
      sourceUrl: NASA_ECLIPSE_URL,
      targetBody: 'sun',
      visibility: solarVisibility(peak, input.observer),
    })
    eclipse = NextGlobalSolarEclipse(eclipse.peak)
  }
}

function addLunarEclipses(input: SkyEventInput, events: SkyEvent[]) {
  let eclipse = SearchLunarEclipse(input.start)
  while (containsDate(input.start, input.end, eclipse.peak.date)) {
    const peak = eclipse.peak.date
    const type = eclipseLabel(eclipse.kind, input.language)
    // sd_penum is the semi-duration in minutes, so the penumbral phase ends one
    // semi-duration after the peak.
    const phaseDurationMs = eclipse.sd_penum * 60 * 1000
    events.push({
      id: `lunar-eclipse-${peak.toISOString().slice(0, 10)}`,
      kind: 'lunar-eclipse',
      startsAt: toIso(peak),
      endsAt: phaseDurationMs > 0 ? toIso(new Date(peak.getTime() + phaseDurationMs)) : null,
      title: t(input.language, `${type} Ay Tutulması`, `${type} Lunar Eclipse`),
      summary: t(
        input.language,
        'Ay, Dünya’nın gölgesinden geçer; görünürlük seçilen konuma bağlıdır.',
        'The Moon crosses Earth’s shadow; visibility depends on the selected location.',
      ),
      guidance: t(
        input.language,
        'Ay ufkun üzerindeyse çıplak gözle izlenebilir.',
        'It can be viewed safely with the naked eye when the Moon is above the horizon.',
      ),
      sourceUrl: NASA_ECLIPSE_URL,
      targetBody: 'moon',
      visibility: lunarVisibility(peak, input.observer),
    })
    eclipse = NextLunarEclipse(eclipse.peak)
  }
}

/** Below this radiant altitude a shower yields too few meteors to plan for. */
const METEOR_MIN_RADIANT_ALTITUDE_DEGREES = 15

function meteorRadiantNote(window: RadiantWindow, language: UiLanguage): string {
  if (window.bestAt === null) {
    // High latitudes in summer: the Sun never drops 12° below the horizon,
    // whatever the radiant does.
    return t(
      language,
      ' Seçili konumda zirve çevresinde gökyüzü astronomik olarak kararmıyor.',
      ' At the selected location the sky never gets astronomically dark around the maximum.',
    )
  }
  const altitude = Math.round(window.bestAltitudeDegrees)
  const at = window.bestAt.toISOString().slice(11, 16)
  if (window.bestAltitudeDegrees <= 0) {
    return t(language, ' Seçili konumda radyant karanlıkta ufkun üstüne çıkmaz.', ' At the selected location the radiant stays below the horizon in darkness.')
  }
  if (window.bestAltitudeDegrees < METEOR_MIN_RADIANT_ALTITUDE_DEGREES) {
    return t(
      language,
      ` Seçili konumda radyant karanlıkta yalnızca ${altitude}° yükselir (${at} UTC); görülecek meteor sayısı çok düşük kalır.`,
      ` At the selected location the radiant reaches only ${altitude}° in darkness (${at} UTC), so few meteors will show.`,
    )
  }
  return t(
    language,
    ` Seçili konumda radyant karanlıkta en çok ${altitude}° yükselir (${at} UTC).`,
    ` At the selected location the radiant reaches ${altitude}° in darkness (${at} UTC).`,
  )
}

function addMeteorShowers(input: SkyEventInput, events: SkyEvent[]) {
  for (let year = input.start.getUTCFullYear(); year <= input.end.getUTCFullYear(); year += 1) {
    for (const shower of METEOR_SHOWERS) {
      const apparition = showerApparition(shower, year)
      const peak = apparition.peakAt
      if (!containsDate(input.start, input.end, peak)) continue
      const name = t(input.language, shower.nameTr, shower.nameEn)
      const moon = moonIlluminationPercent(peak)
      const window = input.observer
        ? bestRadiantWindow(shower, peak, input.observer.latitude, input.observer.longitude)
        : null
      const activity = `${apparition.activeStart.toISOString().slice(5, 10)} → ${apparition.activeEnd.toISOString().slice(5, 10)}`
      const radiantNote = window ? meteorRadiantNote(window, input.language) : ''
      events.push({
        id: `meteor-${shower.id}-${year}`,
        kind: 'meteor-shower',
        startsAt: toIso(peak),
        endsAt: null,
        title: t(input.language, `${name} Meteor Yağmuru`, `${name} Meteor Shower`),
        summary: t(
          input.language,
          `${shower.parentBody} kaynaklı akış · IMO ZHR ${apparition.zhr} · etkinlik ${activity} · zirvede Ay %${moon} aydınlık.${radiantNote}`,
          `Stream of ${shower.parentBody} · IMO ZHR ${apparition.zhr} · active ${activity} · Moon ${moon}% lit at maximum.${radiantNote}`,
        ),
        guidance: t(
          input.language,
          'Karanlık bir konum seçin; radyant yükseldikçe göğün geniş bir bölümünü, radyanttan biraz uzağa bakarak izleyin.',
          'Choose a dark site; as the radiant climbs, watch a wide stretch of sky a little away from it.',
        ),
        sourceUrl: apparition.sourceUrl,
        targetBody: 'earth',
        visibility: window
          ? window.bestAt !== null && window.bestAltitudeDegrees >= METEOR_MIN_RADIANT_ALTITUDE_DEGREES
            ? 'local-visible'
            : 'local-not-visible'
          : 'location-required',
      })
    }
  }
}

/** Distance from Earth's centre to the Moon's centre, km. */
function moonDistanceKm(date: Date): number {
  const vector = GeoMoon(date)
  return Math.hypot(vector.x, vector.y, vector.z) * AU_KM
}

/**
 * NASA's working definition: a full Moon within 90 % of perigee, i.e. in the
 * closest tenth of the span between the surrounding apogee and perigee.
 */
function isSupermoon(fullMoon: Date): boolean {
  let apsis = SearchLunarApsis(new Date(fullMoon.getTime() - 16 * DAY_MS))
  let perigeeKm: number | null = null
  let apogeeKm: number | null = null
  let perigeeGap = Number.POSITIVE_INFINITY
  let apogeeGap = Number.POSITIVE_INFINITY
  while (apsis.time.date.getTime() < fullMoon.getTime() + 16 * DAY_MS) {
    const gap = Math.abs(apsis.time.date.getTime() - fullMoon.getTime())
    if (apsis.kind === ApsisKind.Pericenter && gap < perigeeGap) {
      perigeeGap = gap
      perigeeKm = apsis.dist_km
    } else if (apsis.kind === ApsisKind.Apocenter && gap < apogeeGap) {
      apogeeGap = gap
      apogeeKm = apsis.dist_km
    }
    apsis = NextLunarApsis(apsis)
  }
  if (perigeeKm === null || apogeeKm === null) return false
  return (apogeeKm - moonDistanceKm(fullMoon)) / (apogeeKm - perigeeKm) >= 0.9
}

function addMoonPhases(input: SkyEventInput, events: SkyEvent[]) {
  const names: Array<[string, string]> = [
    ['Yeni Ay', 'New Moon'],
    ['İlk Dördün', 'First Quarter'],
    ['Dolunay', 'Full Moon'],
    ['Son Dördün', 'Last Quarter'],
  ]
  let quarter = SearchMoonQuarter(input.start)
  while (containsDate(input.start, input.end, quarter.time.date)) {
    const when = quarter.time.date
    const distanceKm = Math.round(moonDistanceKm(when))
    const supermoon = quarter.quarter === 2 && isSupermoon(when)
    const [nameTr, nameEn] = names[quarter.quarter]
    const darkSky = quarter.quarter === 0
    events.push({
      id: `moon-phase-${quarter.quarter}-${when.toISOString().slice(0, 10)}`,
      kind: 'moon-phase',
      startsAt: toIso(when),
      endsAt: null,
      title: supermoon
        ? t(input.language, 'Süper Dolunay', 'Supermoon')
        : t(input.language, nameTr, nameEn),
      summary: supermoon
        ? t(
          input.language,
          `Dolunay yerberiye yakın: Ay ${distanceKm.toLocaleString('tr-TR')} km uzakta. NASA tanımıyla süper ay, yılın en sönük dolunayından %30'a kadar daha parlak görünebilir.`,
          `A full Moon near perigee: the Moon is ${distanceKm.toLocaleString('en-US')} km away. By NASA's definition a supermoon, it can look up to 30% brighter than the year's faintest full Moon.`,
        )
        : t(
          input.language,
          `Ay evresi; Dünya–Ay uzaklığı ${distanceKm.toLocaleString('tr-TR')} km.`,
          `Lunar phase; Earth–Moon distance ${distanceKm.toLocaleString('en-US')} km.`,
        ),
      guidance: darkSky
        ? t(input.language, 'Ay ışığı yok: sönük gökler ve meteorlar için en iyi gecelerdir.', 'No moonlight: the best nights for faint skies and meteors.')
        : quarter.quarter === 2
          ? t(input.language, 'Ay bütün gece gökte; sönük cisimler için en kötü gecedir.', 'The Moon is up all night; the worst night for faint objects.')
          : t(input.language, 'Terminatör boyunca kraterler en belirgin hâlindedir.', 'Craters stand out most sharply along the terminator.'),
      sourceUrl: supermoon ? NASA_SUPERMOON_URL : NASA_MOON_PHASES_URL,
      targetBody: 'moon',
      visibility: input.observer ? 'global' : 'location-required',
    })
    quarter = NextMoonQuarter(quarter)
  }
}

function addMaximumElongations(input: SkyEventInput, events: SkyEvent[]) {
  for (const body of [Body.Mercury, Body.Venus] as const) {
    let event = SearchMaxElongation(body, input.start)
    while (containsDate(input.start, input.end, event.time.date)) {
      const info = BODY_INFO[body]
      const morning = event.visibility === 'morning'
      events.push({
        id: `maximum-elongation-${info.id}-${event.time.date.toISOString().slice(0, 10)}`,
        kind: 'maximum-elongation',
        startsAt: toIso(event.time.date),
        endsAt: null,
        title: t(input.language, `${info.tr} en büyük uzanımda`, `${info.en} at greatest elongation`),
        summary: t(
          input.language,
          `${info.tr}, Güneş’ten ${event.elongation.toFixed(1)}° açısal uzaklığa ulaşır.`,
          `${info.en} reaches an angular separation of ${event.elongation.toFixed(1)}° from the Sun.`,
        ),
        guidance: t(
          input.language,
          morning ? 'Şafaktan önce doğu ufkunu kontrol edin.' : 'Gün batımından sonra batı ufkunu kontrol edin.',
          morning ? 'Check the eastern horizon before dawn.' : 'Check the western horizon after sunset.',
        ),
        sourceUrl: JPL_PLANETS_URL,
        targetBody: info.id,
        visibility: input.observer ? 'global' : 'location-required',
      })
      event = SearchMaxElongation(body, new Date(event.time.date.getTime() + 24 * 60 * 60 * 1000))
    }
  }
}

function addPlanetAlignments(input: SkyEventInput, events: SkyEvent[]) {
  const outer = [Body.Mars, Body.Jupiter, Body.Saturn, Body.Uranus, Body.Neptune] as const
  const inner = [Body.Mercury, Body.Venus] as const

  const push = (
    body: PlanetBody,
    when: Date,
    kind: 'opposition' | 'conjunction',
    variant: 'opposition' | 'solar' | 'inferior' | 'superior',
  ) => {
    const info = BODY_INFO[body]
    const titles: Record<typeof variant, [string, string]> = {
      opposition: [`${info.tr} karşı konumda`, `${info.en} at opposition`],
      solar: [`${info.tr} Güneş doğrultusunda`, `${info.en} in solar conjunction`],
      inferior: [`${info.tr} iç kavuşumda`, `${info.en} at inferior conjunction`],
      superior: [`${info.tr} dış kavuşumda`, `${info.en} at superior conjunction`],
    }
    const summaries: Record<typeof variant, [string, string]> = {
      opposition: [
        `${info.tr}, Dünya’nın gece tarafında Güneş’in karşısında; yıl içinde en yakın ve en parlak dönemindedir.`,
        `${info.en} lies opposite the Sun in Earth’s night sky, near its closest and brightest for the year.`,
      ],
      solar: [`${info.tr}, gökyüzünde Güneş’e yakın doğrultudadır.`, `${info.en} lies close to the Sun’s direction in the sky.`],
      inferior: [`${info.tr}, Dünya ile Güneş arasından geçer.`, `${info.en} passes between Earth and the Sun.`],
      superior: [`${info.tr}, Güneş’in arkasından geçer.`, `${info.en} passes behind the Sun.`],
    }
    const isOpposition = variant === 'opposition'
    const [titleTr, titleEn] = titles[variant]
    const [summaryTr, summaryEn] = summaries[variant]
    events.push({
      id: `${kind}-${variant === 'opposition' || variant === 'solar' ? '' : `${variant}-`}${info.id}-${when.toISOString().slice(0, 10)}`,
      kind,
      startsAt: toIso(when),
      endsAt: null,
      title: t(input.language, titleTr, titleEn),
      summary: t(input.language, summaryTr, summaryEn),
      guidance: isOpposition
        ? t(input.language, 'Gün batımında doğar, bütün gece gözlenebilir.', 'It rises at sunset and is observable all night.')
        : t(input.language, 'Güneş parlaması nedeniyle gözlem için uygun değildir.', 'It is not suitable for observation because of solar glare.'),
      sourceUrl: JPL_PLANETS_URL,
      targetBody: info.id,
      visibility: input.observer ? 'global' : 'location-required',
    })
  }

  // Each search finds the next event after its start, so step past the last
  // hit until the window is exhausted; a long window can hold several.
  const each = (body: PlanetBody, relativeLongitude: number, visit: (when: Date) => void) => {
    let from = input.start
    for (;;) {
      const when = SearchRelativeLongitude(body, relativeLongitude, from).date
      if (!containsDate(input.start, input.end, when)) return
      visit(when)
      from = new Date(when.getTime() + DAY_MS)
    }
  }
  for (const body of outer) {
    each(body, 0, (when) => push(body, when, 'opposition', 'opposition'))
    each(body, 180, (when) => push(body, when, 'conjunction', 'solar'))
  }
  for (const body of inner) {
    each(body, 0, (when) => push(body, when, 'conjunction', 'inferior'))
    each(body, 180, (when) => push(body, when, 'conjunction', 'superior'))
  }
}

/** Naked-eye planets; pairs closer than this many degrees are reported. */
const PAIR_BODIES = [Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn] as const
const PAIR_MAX_SEPARATION_DEGREES = 1.5
/** Pairs this close to the Sun are lost in twilight glare and skipped. */
const PAIR_MIN_ELONGATION_DEGREES = 12

function separationDegrees(left: Body, right: Body, when: Date): number {
  return AngleBetween(GeoVector(left, when, true), GeoVector(right, when, true))
}

function addPlanetPairs(input: SkyEventInput, events: SkyEvent[]) {
  const stepMs = 6 * 60 * 60 * 1000
  const firstMs = input.start.getTime() - stepMs
  const sampleCount = Math.floor((input.end.getTime() + stepMs - firstMs) / stepMs) + 1
  // One geocentric direction per body per step, shared by all ten pairs; the
  // pair scan then costs a dot product instead of two ephemeris evaluations.
  const directions = PAIR_BODIES.map((body) => {
    const samples: Array<[number, number, number]> = []
    for (let index = 0; index < sampleCount; index++) {
      const vector = GeoVector(body, new Date(firstMs + index * stepMs), true)
      const length = Math.hypot(vector.x, vector.y, vector.z)
      samples.push([vector.x / length, vector.y / length, vector.z / length])
    }
    return samples
  })
  const sampledSeparation = (a: number, b: number, index: number) => {
    const [ax, ay, az] = directions[a][index]
    const [bx, by, bz] = directions[b][index]
    return (Math.acos(Math.min(1, Math.max(-1, ax * bx + ay * by + az * bz))) * 180) / Math.PI
  }
  for (let a = 0; a < PAIR_BODIES.length; a++) {
    for (let b = a + 1; b < PAIR_BODIES.length; b++) {
      const left = PAIR_BODIES[a]
      const right = PAIR_BODIES[b]
      for (let index = 1; index < sampleCount - 1; index++) {
        const ms = firstMs + index * stepMs
        const previous = sampledSeparation(a, b, index - 1)
        const current = sampledSeparation(a, b, index)
        const next = sampledSeparation(a, b, index + 1)
        if (current <= previous && current < next && current < PAIR_MAX_SEPARATION_DEGREES + 0.5) {
          // Golden-section refinement of the minimum inside [ms − step, ms + step].
          let low = ms - stepMs
          let high = ms + stepMs
          const ratio = (Math.sqrt(5) - 1) / 2
          // 24 iterations shrink the 12 h bracket below one second.
          for (let iteration = 0; iteration < 24; iteration++) {
            const x1 = high - ratio * (high - low)
            const x2 = low + ratio * (high - low)
            if (separationDegrees(left, right, new Date(x1)) < separationDegrees(left, right, new Date(x2))) high = x2
            else low = x1
          }
          const when = new Date((low + high) / 2)
          const separation = separationDegrees(left, right, when)
          const elongation = Math.min(AngleFromSun(left, when), AngleFromSun(right, when))
          if (
            separation < PAIR_MAX_SEPARATION_DEGREES &&
            elongation >= PAIR_MIN_ELONGATION_DEGREES &&
            containsDate(input.start, input.end, when)
          ) {
            const leftInfo = BODY_INFO[left]
            const rightInfo = BODY_INFO[right]
            events.push({
              id: `planet-pair-${leftInfo.id}-${rightInfo.id}-${when.toISOString().slice(0, 10)}`,
              kind: 'planet-pair',
              startsAt: toIso(when),
              endsAt: null,
              title: t(input.language, `${leftInfo.tr} – ${rightInfo.tr} yakınlaşması`, `${leftInfo.en}–${rightInfo.en} close approach`),
              summary: t(
                input.language,
                `İki gezegen gökyüzünde ${separation.toFixed(2)}° (${Math.round(separation * 60)}′) yaklaşır; Güneş’ten uzanım ${Math.round(elongation)}°.`,
                `The two planets close to ${separation.toFixed(2)}° (${Math.round(separation * 60)}′) apart; elongation from the Sun ${Math.round(elongation)}°.`,
              ),
              guidance: t(
                input.language,
                'Çıplak gözle görülür; dürbün veya küçük teleskop ikisini aynı görüş alanında gösterir.',
                'Visible to the naked eye; binoculars or a small telescope show both in one field.',
              ),
              sourceUrl: JPL_PLANETS_URL,
              targetBody: leftInfo.id,
              visibility: input.observer ? 'global' : 'location-required',
            })
          }
        }
      }
    }
  }
}

export function getSkyEvents(input: SkyEventInput): SkyEvent[] {
  if (!Number.isFinite(input.start.getTime()) || !Number.isFinite(input.end.getTime())) {
    throw new Error(`Skywatch event window requires valid dates; received start=${input.start.toString()} end=${input.end.toString()}`)
  }
  if (input.end.getTime() <= input.start.getTime()) {
    throw new Error(`Skywatch event window end must be after start; received start=${input.start.toISOString()} end=${input.end.toISOString()}`)
  }

  const events: SkyEvent[] = []
  addSolarEclipses(input, events)
  addLunarEclipses(input, events)
  addMeteorShowers(input, events)
  addMoonPhases(input, events)
  addMaximumElongations(input, events)
  addPlanetAlignments(input, events)
  addPlanetPairs(input, events)

  const seen = new Set<string>()
  return events
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    .filter((event) => {
      if (seen.has(event.id)) return false
      seen.add(event.id)
      return true
    })
}
