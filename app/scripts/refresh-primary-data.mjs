import { readFileSync } from 'node:fs'

const dataUrl = (file) => new URL(`../public/data/${file}`, import.meta.url)
const REQUIRED_METEOR_SOURCE = 'https://www.imo.net/files/meteor-shower/cal2026.pdf'
const REQUIRED_HORIZONS_PREFIX = 'https://ssd.jpl.nasa.gov/api/horizons.api?'

function readJson(file) {
  try {
    return JSON.parse(readFileSync(dataUrl(file), 'utf8'))
  } catch (error) {
    throw new Error(`Unable to read ${file}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function requireObject(value, label) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value
}

function requireText(record, field, label) {
  const value = record[field]
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label}.${field} must be a non-empty string`)
  return value
}

function isIsoInstant(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
}

function isReviewDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
}

function validateMeteorCalendar(value) {
  const calendar = requireObject(value, 'meteor-calendar-2026.json')
  if (calendar.schemaVersion !== 1) throw new Error(`Unsupported meteor calendar schemaVersion: ${String(calendar.schemaVersion)}`)
  if (calendar.year !== 2026) throw new Error(`Meteor calendar only supports year 2026; received ${String(calendar.year)}`)
  if (calendar.publisher !== 'International Meteor Organization') throw new Error(`Unexpected meteor calendar publisher: ${String(calendar.publisher)}`)
  if (requireText(calendar, 'sourceUrl', 'meteor-calendar-2026.json') !== REQUIRED_METEOR_SOURCE) {
    throw new Error('Meteor calendar sourceUrl must be the reviewed 2026 IMO PDF')
  }
  if (!isIsoInstant(calendar.retrievedAt)) throw new Error('Meteor calendar retrievedAt must be a valid ISO instant')
  if (!isReviewDate(calendar.reviewedAt)) throw new Error('Meteor calendar reviewedAt must be a valid review date')
  requireText(calendar, 'limitation', 'meteor-calendar-2026.json')
  if (!Array.isArray(calendar.showers) || calendar.showers.length === 0) throw new Error('Meteor calendar must contain at least one reviewed shower')
  for (const entry of calendar.showers) {
    const shower = requireObject(entry, 'meteor-calendar-2026.json.showers[]')
    const id = requireText(shower, 'id', 'meteor-calendar-2026.json.showers[]')
    for (const field of ['activeStart', 'activeEnd', 'maximumStart', 'maximumEnd']) {
      if (!isIsoInstant(shower[field])) throw new Error(`Meteor shower ${id}.${field} must be a valid ISO instant`)
    }
    if (Date.parse(shower.maximumStart) > Date.parse(shower.maximumEnd)) {
      throw new Error(`Meteor shower ${id} maximum window is invalid`)
    }
  }
  return calendar.showers.length
}

function validateVector(value, label) {
  const vector = requireObject(value, label)
  for (const axis of ['x', 'y', 'z']) {
    if (typeof vector[axis] !== 'number' || !Number.isFinite(vector[axis])) {
      throw new Error(`${label}.${axis} must be finite`)
    }
  }
}

function validateHorizonsRecords(value) {
  const payload = requireObject(value, 'horizons-probes.json')
  if (payload.schemaVersion !== 1) throw new Error(`Unsupported Horizons payload schemaVersion: ${String(payload.schemaVersion)}`)
  if (payload.publisher !== 'NASA/JPL Horizons') throw new Error(`Unexpected Horizons publisher: ${String(payload.publisher)}`)
  if (!isIsoInstant(payload.retrievedAt)) throw new Error('Horizons payload retrievedAt must be a valid ISO instant')
  if (!isReviewDate(payload.reviewedAt)) throw new Error('Horizons payload reviewedAt must be a valid review date')
  if (!Array.isArray(payload.records) || payload.records.length === 0) throw new Error('Horizons payload must contain at least one reviewed record')
  for (const entry of payload.records) {
    const record = requireObject(entry, 'horizons-probes.json.records[]')
    const id = requireText(record, 'id', 'horizons-probes.json.records[]')
    if (!requireText(record, 'sourceUrl', `Horizons record ${id}`).startsWith(REQUIRED_HORIZONS_PREFIX)) {
      throw new Error(`Horizons record ${id} must use a direct JPL Horizons API URL`)
    }
    const epoch = requireObject(record.epoch, `Horizons record ${id}.epoch`)
    if (typeof epoch.value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/.test(epoch.value) || epoch.timeScale !== 'TDB') {
      throw new Error(`Horizons record ${id} requires a TDB source epoch`)
    }
    if (record.frame !== 'ICRF') throw new Error(`Horizons record ${id} requires the ICRF frame`)
    requireText(record, 'limitation', `Horizons record ${id}`)
    validateVector(record.positionAu, `Horizons record ${id}.positionAu`)
    validateVector(record.velocityAuPerDay, `Horizons record ${id}.velocityAuPerDay`)
  }
  return payload.records.length
}

const args = process.argv.slice(2)
if (args.length !== 1 || args[0] !== '--check') {
  throw new Error('refresh-primary-data only supports --check; reviewed source data is never fetched, written, or committed automatically')
}

const horizonsCount = validateHorizonsRecords(readJson('horizons-probes.json'))
const meteorCount = validateMeteorCalendar(readJson('meteor-calendar-2026.json'))
console.log(`Validated primary source records: Horizons=${horizonsCount}, IMO=${meteorCount}.`)
console.log('No tracked source data was modified; this command never commits.')
