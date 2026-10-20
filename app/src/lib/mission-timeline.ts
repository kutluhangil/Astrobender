import type { CelestialBodyId } from './planets.ts'

export const NSSDCA_MASTER_CATALOG_URL = 'https://nssdc.gsfc.nasa.gov/nmc/'

export type MissionEventKind =
  | 'launch'
  | 'flyby'
  | 'orbit-insertion'
  | 'landing'
  | 'end'
  | 'impact'
  | 'flight'
  | 'sample-return'
  | 'milestone'

export interface MissionEvent {
  id: string
  /** UTC instant of the event, to the minute where the record gives one. */
  at: string
  /** 'day' when the source dates the event but gives no time of day. */
  precision?: 'minute' | 'day'
  kind: MissionEventKind
  missionTr: string
  missionEn: string
  titleTr: string
  titleEn: string
  /** Body the scene focuses when the event is opened. */
  targetBody: CelestialBodyId
  /** Landing site in `landing-sites.ts` this event corresponds to, when one exists. */
  landingSiteId?: string
  /** NSSDCA master catalogue entry, or the mission page where NSSDCA has none. */
  sourceUrl: string
}

const NSSDCA = (id: string) => `${NSSDCA_MASTER_CATALOG_URL}spacecraft/display.action?id=${id}`

/**
 * A sourced timeline of the missions the scene can actually show. Every entry
 * either lands on a modelled surface site or targets a modelled body, so
 * selecting one moves the simulation clock to a moment the scene can render
 * rather than to an abstract date.
 */
export const MISSION_EVENTS: readonly MissionEvent[] = [
  {
    id: 'apollo11-launch',
    at: '1969-07-16T13:32:00Z',
    kind: 'launch',
    missionTr: 'Apollo 11',
    missionEn: 'Apollo 11',
    titleTr: 'Kennedy Uzay Merkezi’nden fırlatma',
    titleEn: 'Launch from Kennedy Space Center',
    targetBody: 'earth',
    landingSiteId: 'kennedy-space-center',
    sourceUrl: NSSDCA('1969-059A'),
  },
  {
    id: 'apollo11-landing',
    at: '1969-07-20T20:17:00Z',
    kind: 'landing',
    missionTr: 'Apollo 11',
    missionEn: 'Apollo 11',
    titleTr: 'Sakinlik Denizi’ne iniş',
    titleEn: 'Touchdown in the Sea of Tranquility',
    targetBody: 'moon',
    landingSiteId: 'apollo11',
    sourceUrl: NSSDCA('1969-059C'),
  },
  {
    id: 'apollo12-landing',
    at: '1969-11-19T06:54:00Z',
    kind: 'landing',
    missionTr: 'Apollo 12',
    missionEn: 'Apollo 12',
    titleTr: 'Fırtınalar Okyanusu’na hassas iniş',
    titleEn: 'Precision landing in the Ocean of Storms',
    targetBody: 'moon',
    landingSiteId: 'apollo12',
    sourceUrl: NSSDCA('1969-099C'),
  },
  {
    id: 'apollo15-landing',
    at: '1971-07-30T22:16:00Z',
    kind: 'landing',
    missionTr: 'Apollo 15',
    missionEn: 'Apollo 15',
    titleTr: 'Hadley Rille’a iniş',
    titleEn: 'Landing at Hadley Rille',
    targetBody: 'moon',
    landingSiteId: 'apollo15',
    sourceUrl: NSSDCA('1971-063C'),
  },
  {
    id: 'apollo17-landing',
    at: '1972-12-11T19:54:00Z',
    kind: 'landing',
    missionTr: 'Apollo 17',
    missionEn: 'Apollo 17',
    titleTr: 'Taurus–Littrow’a son insanlı iniş',
    titleEn: 'The last crewed landing, at Taurus-Littrow',
    targetBody: 'moon',
    landingSiteId: 'apollo17',
    sourceUrl: NSSDCA('1972-096C'),
  },
  {
    id: 'viking1-landing',
    at: '1976-07-20T11:53:00Z',
    kind: 'landing',
    missionTr: 'Viking 1',
    missionEn: 'Viking 1',
    titleTr: 'Chryse Planitia’ya ilk başarılı Mars inişi',
    titleEn: 'First successful Mars landing, on Chryse Planitia',
    targetBody: 'mars',
    landingSiteId: 'viking1',
    sourceUrl: NSSDCA('1975-075C'),
  },
  {
    id: 'venera13-landing',
    at: '1982-03-01T03:57:00Z',
    kind: 'landing',
    missionTr: 'Venera 13',
    missionEn: 'Venera 13',
    titleTr: 'Venüs yüzeyinden renkli görüntüler',
    titleEn: 'Colour images from the surface of Venus',
    targetBody: 'venus',
    landingSiteId: 'venera13',
    sourceUrl: NSSDCA('1981-106D'),
  },
  {
    id: 'voyager2-neptune',
    at: '1989-08-25T03:56:00Z',
    kind: 'flyby',
    missionTr: 'Voyager 2',
    missionEn: 'Voyager 2',
    titleTr: 'Neptün yakın geçişi',
    titleEn: 'Neptune close approach',
    targetBody: 'neptune',
    sourceUrl: NSSDCA('1977-076A'),
  },
  {
    id: 'cassini-saturn',
    at: '2004-07-01T02:48:00Z',
    kind: 'orbit-insertion',
    missionTr: 'Cassini',
    missionEn: 'Cassini',
    titleTr: 'Satürn yörüngesine giriş',
    titleEn: 'Saturn orbit insertion',
    targetBody: 'saturn',
    sourceUrl: NSSDCA('1997-061A'),
  },
  {
    id: 'huygens-titan',
    at: '2005-01-14T11:38:00Z',
    kind: 'landing',
    missionTr: 'Huygens',
    missionEn: 'Huygens',
    titleTr: 'Titan yüzeyine iniş',
    titleEn: 'Descent to the surface of Titan',
    targetBody: 'titan',
    landingSiteId: 'huygens',
    sourceUrl: NSSDCA('1997-061C'),
  },
  {
    id: 'curiosity-landing',
    at: '2012-08-06T05:17:00Z',
    kind: 'landing',
    missionTr: 'Curiosity',
    missionEn: 'Curiosity',
    titleTr: 'Gale Krateri’ne gökyüzü vinciyle iniş',
    titleEn: 'Sky-crane landing in Gale Crater',
    targetBody: 'mars',
    landingSiteId: 'curiosity',
    sourceUrl: NSSDCA('2011-070A'),
  },
  {
    id: 'rosetta-arrival',
    at: '2014-08-06T09:00:00Z',
    kind: 'orbit-insertion',
    missionTr: 'Rosetta',
    missionEn: 'Rosetta',
    titleTr: '67P kuyruklu yıldızına varış',
    titleEn: 'Arrival at comet 67P',
    targetBody: 'sun',
    sourceUrl: NSSDCA('2004-006A'),
  },
  {
    id: 'newhorizons-pluto',
    at: '2015-07-14T11:49:00Z',
    kind: 'flyby',
    missionTr: 'New Horizons',
    missionEn: 'New Horizons',
    titleTr: 'Plüton yakın geçişi',
    titleEn: 'Pluto close approach',
    targetBody: 'pluto',
    sourceUrl: NSSDCA('2006-001A'),
  },
  {
    id: 'juno-jupiter',
    at: '2016-07-05T03:53:00Z',
    kind: 'orbit-insertion',
    missionTr: 'Juno',
    missionEn: 'Juno',
    titleTr: 'Jüpiter yörüngesine giriş',
    titleEn: 'Jupiter orbit insertion',
    targetBody: 'jupiter',
    sourceUrl: NSSDCA('2011-040A'),
  },
  {
    id: 'cassini-end',
    at: '2017-09-15T11:55:00Z',
    kind: 'end',
    missionTr: 'Cassini',
    missionEn: 'Cassini',
    titleTr: 'Satürn atmosferine son dalış',
    titleEn: 'Final plunge into Saturn’s atmosphere',
    targetBody: 'saturn',
    sourceUrl: NSSDCA('1997-061A'),
  },
  {
    id: 'change4-landing',
    at: '2019-01-03T02:26:00Z',
    kind: 'landing',
    missionTr: 'Chang’e 4',
    missionEn: 'Chang’e 4',
    titleTr: 'Ay’ın uzak yüzüne ilk iniş',
    titleEn: 'First landing on the lunar far side',
    targetBody: 'moon',
    landingSiteId: 'change4',
    sourceUrl: NSSDCA('2018-103A'),
  },
  {
    id: 'perseverance-landing',
    at: '2021-02-18T20:55:00Z',
    kind: 'landing',
    missionTr: 'Perseverance',
    missionEn: 'Perseverance',
    titleTr: 'Jezero Krateri’ne iniş',
    titleEn: 'Landing in Jezero Crater',
    targetBody: 'mars',
    landingSiteId: 'perseverance',
    sourceUrl: NSSDCA('2020-052A'),
  },
  {
    id: 'zhurong-landing',
    at: '2021-05-14T23:18:00Z',
    kind: 'landing',
    missionTr: 'Zhurong',
    missionEn: 'Zhurong',
    titleTr: 'Utopia Planitia’ya iniş',
    titleEn: 'Landing on Utopia Planitia',
    targetBody: 'mars',
    landingSiteId: 'zhurong',
    sourceUrl: NSSDCA('2020-049A'),
  },
  {
    id: 'voyager1-heliopause',
    // Inferred afterwards from the plasma-wave data; NASA announced it in 2013.
    at: '2012-08-25T00:00:00Z',
    precision: 'day',
    kind: 'milestone',
    missionTr: 'Voyager 1',
    missionEn: 'Voyager 1',
    titleTr: 'Heliopoz geçildi: yıldızlararası uzaya ilk araç',
    titleEn: 'Crossed the heliopause: first craft in interstellar space',
    targetBody: 'sun',
    sourceUrl: NSSDCA('1977-084A'),
  },
  {
    id: 'ingenuity-first-flight',
    at: '2021-04-19T07:34:00Z',
    kind: 'flight',
    missionTr: 'Ingenuity',
    missionEn: 'Ingenuity',
    titleTr: 'Başka bir gezegende ilk motorlu kontrollü uçuş',
    titleEn: 'First powered, controlled flight on another planet',
    targetBody: 'mars',
    landingSiteId: 'perseverance',
    sourceUrl: NSSDCA('2020-052A'),
  },
  {
    id: 'dart-impact',
    at: '2022-09-26T23:14:00Z',
    kind: 'impact',
    missionTr: 'DART',
    missionEn: 'DART',
    titleTr: 'Dimorphos’a çarpış: ilk gezegen savunma testi (Dünya’dan ~11 milyon km)',
    titleEn: 'Impact on Dimorphos: first planetary-defence test (~11 million km from Earth)',
    targetBody: 'earth',
    sourceUrl: NSSDCA('2021-110A'),
  },
  {
    id: 'chandrayaan3-landing',
    at: '2023-08-23T12:33:00Z',
    kind: 'landing',
    missionTr: 'Chandrayaan-3',
    missionEn: 'Chandrayaan-3',
    titleTr: 'Ay’ın güney kutup bölgesine ilk yumuşak iniş',
    titleEn: 'First soft landing near the lunar south pole',
    targetBody: 'moon',
    landingSiteId: 'chandrayaan3',
    // NSSDCA has no record for this mission yet.
    sourceUrl: 'https://www.isro.gov.in/Chandrayaan3_Details.html',
  },
  {
    id: 'osiris-rex-sample-return',
    at: '2023-09-24T14:52:00Z',
    kind: 'sample-return',
    missionTr: 'OSIRIS-REx',
    missionEn: 'OSIRIS-REx',
    titleTr: 'Bennu örnek kapsülü Utah’a indi',
    titleEn: 'Bennu sample capsule lands in Utah',
    targetBody: 'earth',
    sourceUrl: NSSDCA('2016-055A'),
  },
  {
    id: 'change6-landing',
    at: '2024-06-01T22:23:00Z',
    kind: 'landing',
    missionTr: 'Chang’e 6',
    missionEn: 'Chang’e 6',
    titleTr: 'Uzak yüzden ilk örnek için Apollo havzasına iniş',
    titleEn: 'Landing in Apollo basin for the first far-side sample',
    targetBody: 'moon',
    landingSiteId: 'change6',
    // NSSDCA has no record for this mission yet; NASA LRO located the lander.
    sourceUrl: 'https://www.nasa.gov/centers-and-facilities/goddard/nasas-lro-spots-chinas-change-6-spacecraft-on-lunar-far-side',
  },
]

export function missionEventTimeMs(event: MissionEvent): number {
  const parsed = Date.parse(event.at)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Mission event ${event.id} has an unparsable timestamp: ${event.at}`)
  }
  return parsed
}

/** Chronological order, which is the only order a timeline may present. */
export function getMissionTimeline(): MissionEvent[] {
  return [...MISSION_EVENTS].sort((left, right) => missionEventTimeMs(left) - missionEventTimeMs(right))
}

export function missionEventYear(event: MissionEvent): number {
  return new Date(missionEventTimeMs(event)).getUTCFullYear()
}

/** Decade buckets, so the timeline can be scanned before it is read. */
export function groupMissionEventsByDecade(): Array<{ decade: number; events: MissionEvent[] }> {
  const buckets = new Map<number, MissionEvent[]>()
  for (const event of getMissionTimeline()) {
    const decade = Math.floor(missionEventYear(event) / 10) * 10
    const bucket = buckets.get(decade) ?? []
    bucket.push(event)
    buckets.set(decade, bucket)
  }
  return [...buckets.entries()]
    .sort(([left], [right]) => left - right)
    .map(([decade, events]) => ({ decade, events }))
}
