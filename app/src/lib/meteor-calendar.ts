import rawMeteorCalendar from '../../public/data/meteor-calendar-2026.json' with { type: 'json' }

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
  retrievedAt: string
  reviewedAt: string
  limitation: string
  radiant: {
    rightAscensionHours: number
    declinationDegrees: number
  }
}

export interface MeteorCalendarPayload {
  schemaVersion: number
  year: number
  publisher: string
  sourceUrl: string
  retrievedAt: string
  reviewedAt: string
  limitation: string
  showers: Omit<MeteorShowerRecord, 'retrievedAt' | 'reviewedAt' | 'limitation'>[]
}

function isIsoInstant(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
}

function isReviewDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
}

function requireText(record: Record<string, unknown>, field: string): string {
  const value = record[field]
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Meteor calendar ${field} must be a non-empty string`)
  return value
}

export function validateMeteorCalendar(value: unknown): MeteorCalendarPayload {
  if (typeof value !== 'object' || value === null) throw new Error('Meteor calendar payload must be an object')
  const payload = value as Record<string, unknown>
  if (payload.schemaVersion !== 1) throw new Error(`Unsupported meteor calendar schemaVersion: ${String(payload.schemaVersion)}`)
  if (payload.year !== 2026) throw new Error(`Meteor calendar only supports year 2026; received ${String(payload.year)}`)
  if (payload.publisher !== 'International Meteor Organization') throw new Error(`Unexpected meteor calendar publisher: ${String(payload.publisher)}`)
  const sourceUrl = requireText(payload, 'sourceUrl')
  if (sourceUrl !== 'https://www.imo.net/files/meteor-shower/cal2026.pdf') throw new Error(`Meteor calendar sourceUrl must be the reviewed 2026 IMO PDF; received ${sourceUrl}`)
  if (!isIsoInstant(payload.retrievedAt)) throw new Error(`Meteor calendar retrievedAt must be a valid ISO instant; received ${String(payload.retrievedAt)}`)
  if (!isReviewDate(payload.reviewedAt)) throw new Error(`Meteor calendar reviewedAt must be a valid review date; received ${String(payload.reviewedAt)}`)
  const limitation = requireText(payload, 'limitation')
  if (!Array.isArray(payload.showers)) throw new Error('Meteor calendar showers must be an array')

  const ids = new Set<string>()
  const showers = payload.showers.map((value): Omit<MeteorShowerRecord, 'retrievedAt' | 'reviewedAt' | 'limitation'> => {
    if (typeof value !== 'object' || value === null) throw new Error('Meteor shower record must be an object')
    const record = value as Record<string, unknown>
    const id = requireText(record, 'id')
    if (ids.has(id)) throw new Error(`Meteor calendar has duplicate shower id: ${id}`)
    ids.add(id)
    const activeStart = requireText(record, 'activeStart')
    const activeEnd = requireText(record, 'activeEnd')
    const maximumStart = requireText(record, 'maximumStart')
    const maximumEnd = requireText(record, 'maximumEnd')
    if (![activeStart, activeEnd, maximumStart, maximumEnd].every(isIsoInstant)) throw new Error(`Meteor calendar has an invalid ISO window for ${id}`)
    if (Date.parse(activeEnd) < Date.parse(activeStart)) throw new Error(`Meteor active window is invalid for ${id}`)
    if (Date.parse(maximumEnd) < Date.parse(maximumStart)) throw new Error(`Meteor maximum window is invalid for ${id}`)
    if (Date.parse(maximumStart) < Date.parse(activeStart) || Date.parse(maximumEnd) > Date.parse(activeEnd)) throw new Error(`Meteor maximum window must be inside the active window for ${id}`)
    if (typeof record.zhr !== 'number' || !Number.isFinite(record.zhr) || record.zhr < 0) throw new Error(`Meteor ZHR is invalid for ${id}`)
    if (typeof record.northernHemisphere !== 'boolean') throw new Error(`Meteor northernHemisphere must be boolean for ${id}`)
    if (typeof record.radiant !== 'object' || record.radiant === null) throw new Error(`Meteor radiant must be an object for ${id}`)
    const radiant = record.radiant as Record<string, unknown>
    if (typeof radiant.rightAscensionHours !== 'number' || !Number.isFinite(radiant.rightAscensionHours) || typeof radiant.declinationDegrees !== 'number' || !Number.isFinite(radiant.declinationDegrees)) throw new Error(`Meteor radiant coordinates are invalid for ${id}`)
    return {
      id,
      name: requireText(record, 'name'),
      nameTr: requireText(record, 'nameTr'),
      activeStart,
      activeEnd,
      maximumStart,
      maximumEnd,
      parentBody: requireText(record, 'parentBody'),
      zhr: record.zhr,
      northernHemisphere: record.northernHemisphere,
      sourceUrl: requireText(record, 'sourceUrl'),
      radiant: { rightAscensionHours: radiant.rightAscensionHours, declinationDegrees: radiant.declinationDegrees },
    }
  })
  return {
    schemaVersion: 1,
    year: 2026,
    publisher: 'International Meteor Organization',
    sourceUrl,
    retrievedAt: payload.retrievedAt,
    reviewedAt: payload.reviewedAt,
    limitation,
    showers,
  }
}

const calendar2026 = validateMeteorCalendar(rawMeteorCalendar)

const reviewedShowers = calendar2026.showers.map((record) => Object.freeze({
  ...record,
  retrievedAt: calendar2026.retrievedAt,
  reviewedAt: calendar2026.reviewedAt,
  limitation: calendar2026.limitation,
}))

export const PERSEID_2026: MeteorShowerRecord = reviewedShowers.find((record) => record.id === 'perseids')
  ?? (() => { throw new Error('Reviewed 2026 IMO calendar has no Perseids record') })()

export const METEOR_CALENDAR_BY_YEAR: Readonly<Record<number, readonly MeteorShowerRecord[]>> =
  Object.freeze({
    2026: Object.freeze(reviewedShowers),
  })
