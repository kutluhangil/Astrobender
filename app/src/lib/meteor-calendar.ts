export interface MeteorShowerRecord {
  id: string
  name: string
  nameTr: string
  activeStart: string
  activeEnd: string
  maximumStart: string
  maximumEnd: string
  parentBody: string
  zhr: number
  northernHemisphere: boolean
  sourceUrl: string
  radiant: {
    rightAscensionHours: number
    declinationDegrees: number
  }
}

const IMO_2026_CALENDAR_URL = 'https://www.imo.net/files/meteor-shower/cal2026.pdf'

export const PERSEID_2026: MeteorShowerRecord = Object.freeze({
  id: 'perseids',
  name: 'Perseid Meteor Shower',
  nameTr: 'Perseid Meteor Yağmuru',
  activeStart: '2026-07-17T00:00:00.000Z',
  activeEnd: '2026-08-24T23:59:59.999Z',
  maximumStart: '2026-08-13T02:00:00.000Z',
  maximumEnd: '2026-08-13T04:00:00.000Z',
  parentBody: '109P/Swift-Tuttle',
  zhr: 100,
  northernHemisphere: true,
  sourceUrl: IMO_2026_CALENDAR_URL,
  radiant: {
    rightAscensionHours: 3.2,
    declinationDegrees: 58,
  },
})

export const METEOR_CALENDAR_BY_YEAR: Readonly<Record<number, readonly MeteorShowerRecord[]>> =
  Object.freeze({
    2026: Object.freeze([PERSEID_2026]),
  })
