import {
  Body,
  EclipseKind,
  Equator,
  Horizon,
  NextGlobalSolarEclipse,
  NextLunarEclipse,
  Observer,
  SearchGlobalSolarEclipse,
  SearchLocalSolarEclipse,
  SearchLunarEclipse,
  SearchMaxElongation,
  SearchRelativeLongitude,
} from 'astronomy-engine'
import type { CelestialBodyId } from './planets.ts'
import { METEOR_CALENDAR_BY_YEAR } from './meteor-calendar.ts'
import type { EvidenceRecord } from './scientific-evidence.ts'
import type { UiLanguage } from './ui-language.ts'

export type SkyEventKind =
  | 'solar-eclipse'
  | 'lunar-eclipse'
  | 'meteor-shower'
  | 'maximum-elongation'
  | 'conjunction'
  | 'opposition'

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
  evidence: EvidenceRecord
}

interface SkyEventInput {
  start: Date
  end: Date
  observer?: SkyObserver
  language: UiLanguage
}

const NASA_ECLIPSE_URL = 'https://science.nasa.gov/eclipses/future-eclipses/'
const JPL_PLANETS_URL = 'https://ssd.jpl.nasa.gov/planets/'
const ASTRONOMY_ENGINE_URL = 'https://github.com/cosinekitty/astronomy'

function calculatedEvidence(epoch: string, limitation: string): EvidenceRecord {
  return {
    evidenceClass: 'calculated',
    publisher: 'CosineKitty',
    sourceUrl: ASTRONOMY_ENGINE_URL,
    verifiedAt: '2026-08-13',
    method: 'Astronomy Engine 2.1.19',
    epoch,
    uncertainty: 'Unknown; values are rounded for display.',
    limitation,
  }
}

const BODY_INFO: Record<Body.Mercury | Body.Venus | Body.Mars | Body.Jupiter | Body.Saturn, {
  id: CelestialBodyId
  tr: string
  en: string
}> = {
  [Body.Mercury]: { id: 'mercury', tr: 'Merkür', en: 'Mercury' },
  [Body.Venus]: { id: 'venus', tr: 'Venüs', en: 'Venus' },
  [Body.Mars]: { id: 'mars', tr: 'Mars', en: 'Mars' },
  [Body.Jupiter]: { id: 'jupiter', tr: 'Jüpiter', en: 'Jupiter' },
  [Body.Saturn]: { id: 'saturn', tr: 'Satürn', en: 'Saturn' },
}

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

function solarVisibility(start: Date, observer: SkyObserver | undefined): SkyEventVisibility {
  if (!observer) return 'location-required'
  const local = SearchLocalSolarEclipse(start, new Observer(observer.latitude, observer.longitude, 0))
  return Math.abs(local.peak.time.date.getTime() - start.getTime()) < 36 * 60 * 60 * 1000 && local.peak.altitude > 0
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
      evidence: calculatedEvidence(toIso(peak), 'Global eclipse geometry is calculated; local visibility depends on observer coordinates.'),
    })
    eclipse = NextGlobalSolarEclipse(eclipse.peak)
  }
}

function addLunarEclipses(input: SkyEventInput, events: SkyEvent[]) {
  let eclipse = SearchLunarEclipse(input.start)
  while (containsDate(input.start, input.end, eclipse.peak.date)) {
    const peak = eclipse.peak.date
    const type = eclipseLabel(eclipse.kind, input.language)
    const phaseSemiDurationMs = eclipse.sd_penum * 60 * 1000
    events.push({
      id: `lunar-eclipse-${peak.toISOString().slice(0, 10)}`,
      kind: 'lunar-eclipse',
      startsAt: phaseSemiDurationMs > 0
        ? toIso(new Date(peak.getTime() - phaseSemiDurationMs))
        : toIso(peak),
      endsAt: phaseSemiDurationMs > 0
        ? toIso(new Date(peak.getTime() + phaseSemiDurationMs))
        : null,
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
      evidence: calculatedEvidence(toIso(peak), 'Eclipse contacts are calculated; local visibility depends on observer coordinates.'),
    })
    eclipse = NextLunarEclipse(eclipse.peak)
  }
}

function addMeteorShowers(input: SkyEventInput, events: SkyEvent[]) {
  for (let year = input.start.getUTCFullYear() - 1; year <= input.end.getUTCFullYear() + 1; year += 1) {
    for (const stream of METEOR_CALENDAR_BY_YEAR[year] ?? []) {
      const maximumStartMs = Date.parse(stream.maximumStart)
      const maximumEndMs = Date.parse(stream.maximumEnd)
      if (!Number.isFinite(maximumStartMs) || !Number.isFinite(maximumEndMs) || maximumStartMs > maximumEndMs) {
        throw new Error(`Meteor maximum window is invalid for ${stream.id}: ${stream.maximumStart} – ${stream.maximumEnd}`)
      }
      const overlapsInput = maximumStartMs <= input.end.getTime() && maximumEndMs >= input.start.getTime()
      if (!overlapsInput) continue
      events.push({
        id: `meteor-${stream.id}-${year}`,
        kind: 'meteor-shower',
        startsAt: stream.maximumStart,
        endsAt: stream.maximumEnd,
        title: t(input.language, stream.nameTr, stream.name),
        summary: t(
          input.language,
          `${stream.parentBody} kaynaklı akış için IMO, bu kaynak-kaydı yılına ait etkinlik ve maksimum aralığını verir.`,
          `IMO supplies the activity and maximum window for this ${stream.parentBody} stream in the reviewed source record year.`,
        ),
        guidance: t(
          input.language,
          stream.northernHemisphere
            ? 'Karanlık bir konum seçin ve gece yarısından sonra kuzey göğünü izleyin.'
            : 'Karanlık bir konum seçin; en iyi saatler gözlem konumuna göre değişir.',
          stream.northernHemisphere
            ? 'Choose a dark location and watch the northern sky after midnight.'
            : 'Choose a dark location; the best hours vary with the observer location.',
        ),
        sourceUrl: stream.sourceUrl,
        targetBody: 'earth',
        visibility: input.observer ? 'global' : 'location-required',
        evidence: {
          evidenceClass: 'sourced-static',
          publisher: 'International Meteor Organization',
          sourceUrl: stream.sourceUrl,
          retrievedAt: stream.retrievedAt,
          verifiedAt: stream.reviewedAt,
          validFrom: stream.activeStart,
          validUntil: stream.activeEnd,
          uncertainty: 'The published maximum is a time window, not an exact instant.',
          limitation: stream.limitation,
        },
      })
    }
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
        evidence: calculatedEvidence(toIso(event.time.date), 'Geocentric event time; local observing conditions are not included.'),
      })
      event = SearchMaxElongation(body, new Date(event.time.date.getTime() + 24 * 60 * 60 * 1000))
    }
  }
}

function addPlanetAlignments(input: SkyEventInput, events: SkyEvent[]) {
  for (const body of [Body.Mars, Body.Jupiter, Body.Saturn] as const) {
    const info = BODY_INFO[body]
    const opposition = SearchRelativeLongitude(body, 0, input.start).date
    if (containsDate(input.start, input.end, opposition)) {
      events.push({
        id: `opposition-${info.id}-${opposition.toISOString().slice(0, 10)}`,
        kind: 'opposition',
        startsAt: toIso(opposition),
        endsAt: null,
        title: t(input.language, `${info.tr} karşı konumda`, `${info.en} at opposition`),
        summary: t(input.language, `${info.tr}, Dünya’nın gece tarafında Güneş’in karşısında yer alır.`, `${info.en} lies opposite the Sun in Earth’s night sky.`),
        guidance: t(input.language, 'Gün batımından sonra gözlem için uygun bir başlangıç noktasıdır.', 'A useful observing starting point after sunset.'),
        sourceUrl: JPL_PLANETS_URL,
        targetBody: info.id,
        visibility: input.observer ? 'global' : 'location-required',
        evidence: calculatedEvidence(toIso(opposition), 'Geocentric alignment; local observing conditions are not included.'),
      })
    }

    const conjunction = SearchRelativeLongitude(body, 180, input.start).date
    if (containsDate(input.start, input.end, conjunction)) {
      events.push({
        id: `conjunction-${info.id}-${conjunction.toISOString().slice(0, 10)}`,
        kind: 'conjunction',
        startsAt: toIso(conjunction),
        endsAt: null,
        title: t(input.language, `${info.tr} Güneş doğrultusunda`, `${info.en} in solar conjunction`),
        summary: t(input.language, `${info.tr}, gökyüzünde Güneş’e yakın doğrultudadır.`, `${info.en} lies close to the Sun’s direction in the sky.`),
        guidance: t(input.language, 'Güneş parlaması nedeniyle gözlem için uygun değildir.', 'It is not suitable for observation because of solar glare.'),
        sourceUrl: JPL_PLANETS_URL,
        targetBody: info.id,
        visibility: input.observer ? 'global' : 'location-required',
        evidence: calculatedEvidence(toIso(conjunction), 'Geocentric alignment; local observing conditions are not included.'),
      })
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
  addMaximumElongations(input, events)
  addPlanetAlignments(input, events)

  const seen = new Set<string>()
  return events
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    .filter((event) => {
      if (seen.has(event.id)) return false
      seen.add(event.id)
      return true
    })
}
