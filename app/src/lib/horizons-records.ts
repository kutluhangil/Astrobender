import rawHorizonsRecords from '../../public/data/horizons-probes.json' with { type: 'json' }

export interface HorizonsEpoch {
  value: string
  timeScale: 'TDB'
}

export interface HorizonsVectorAu {
  x: number
  y: number
  z: number
}

export interface HorizonsProbeRecord {
  id: string
  missionName: string
  sourceUrl: string
  retrievedAt: string
  reviewedAt: string
  epoch: HorizonsEpoch
  frame: 'ICRF'
  center: string
  positionAu: HorizonsVectorAu
  velocityAuPerDay: HorizonsVectorAu
  limitation: string
}

interface HorizonsPayload {
  schemaVersion: number
  publisher: string
  retrievedAt: string
  reviewedAt: string
  records: unknown[]
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isReviewDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
}

function isRetrievedAt(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
}

function requireVector(value: unknown, field: string): HorizonsVectorAu {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`${field} must be an object with finite x, y, and z coordinates`)
  }
  const vector = value as Record<string, unknown>
  for (const axis of ['x', 'y', 'z'] as const) {
    if (typeof vector[axis] !== 'number' || !Number.isFinite(vector[axis])) {
      throw new Error(`${field}.${axis} must be finite; received ${String(vector[axis])}`)
    }
  }
  return { x: vector.x as number, y: vector.y as number, z: vector.z as number }
}

export function validateHorizonsProbeRecord(value: unknown): HorizonsProbeRecord {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Horizons probe record must be an object')
  }
  const record = value as Record<string, unknown>
  for (const field of ['id', 'missionName', 'sourceUrl', 'center', 'limitation'] as const) {
    if (!isNonEmptyString(record[field])) throw new Error(`Horizons record ${field} must be a non-empty string`)
  }
  const id = record.id as string
  const missionName = record.missionName as string
  const sourceUrl = record.sourceUrl as string
  const center = record.center as string
  const limitation = record.limitation as string
  if (!sourceUrl.startsWith('https://ssd.jpl.nasa.gov/api/horizons.api?')) {
    throw new Error(`Horizons record sourceUrl must be a direct JPL Horizons API URL; received ${sourceUrl}`)
  }
  if (!isRetrievedAt(record.retrievedAt)) throw new Error(`Horizons record retrievedAt must be a valid ISO instant; received ${String(record.retrievedAt)}`)
  if (!isReviewDate(record.reviewedAt)) throw new Error(`Horizons record reviewedAt must be a valid review date; received ${String(record.reviewedAt)}`)
  if (typeof record.epoch !== 'object' || record.epoch === null) throw new Error('Horizons record epoch must be an object')
  const epoch = record.epoch as Record<string, unknown>
  if (!isNonEmptyString(epoch.value) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/.test(epoch.value)) {
    throw new Error(`Horizons record epoch.value must be a TDB timestamp without a UTC suffix; received ${String(epoch.value)}`)
  }
  if (epoch.timeScale !== 'TDB') throw new Error(`Horizons record epoch.timeScale must be TDB; received ${String(epoch.timeScale)}`)
  if (record.frame !== 'ICRF') throw new Error(`Horizons record frame must be ICRF; received ${String(record.frame)}`)
  const retrievedAt = record.retrievedAt as string
  const reviewedAt = record.reviewedAt as string
  const epochValue = epoch.value as string

  return {
    id,
    missionName,
    sourceUrl,
    retrievedAt,
    reviewedAt,
    epoch: { value: epochValue, timeScale: 'TDB' },
    frame: record.frame,
    center,
    positionAu: requireVector(record.positionAu, 'positionAu'),
    velocityAuPerDay: requireVector(record.velocityAuPerDay, 'velocityAuPerDay'),
    limitation,
  }
}

function validatePayload(value: unknown): readonly HorizonsProbeRecord[] {
  if (typeof value !== 'object' || value === null) throw new Error('Horizons payload must be an object')
  const payload = value as HorizonsPayload
  if (payload.schemaVersion !== 1) throw new Error(`Unsupported Horizons payload schemaVersion: ${String(payload.schemaVersion)}`)
  if (payload.publisher !== 'NASA/JPL Horizons') throw new Error(`Unexpected Horizons publisher: ${String(payload.publisher)}`)
  if (!isRetrievedAt(payload.retrievedAt)) throw new Error(`Horizons payload retrievedAt is invalid: ${String(payload.retrievedAt)}`)
  if (!isReviewDate(payload.reviewedAt)) throw new Error(`Horizons payload reviewedAt is invalid: ${String(payload.reviewedAt)}`)
  if (!Array.isArray(payload.records) || payload.records.length === 0) throw new Error('Horizons payload must contain at least one reviewed record')

  const ids = new Set<string>()
  const records = payload.records.map((raw) => {
    const record = validateHorizonsProbeRecord({
      ...(typeof raw === 'object' && raw !== null ? raw : {}),
      retrievedAt: payload.retrievedAt,
      reviewedAt: payload.reviewedAt,
    })
    if (ids.has(record.id)) throw new Error(`Horizons payload has duplicate mission id: ${record.id}`)
    ids.add(record.id)
    return Object.freeze(record)
  })
  return Object.freeze(records)
}

export const HORIZONS_PROBE_RECORDS = validatePayload(rawHorizonsRecords)

export function getHorizonsProbeRecord(id: string): HorizonsProbeRecord | null {
  return HORIZONS_PROBE_RECORDS.find((record) => record.id === id) ?? null
}

export function horizonsDistanceAu(record: HorizonsProbeRecord): number {
  const { x, y, z } = record.positionAu
  return Math.hypot(x, y, z)
}
