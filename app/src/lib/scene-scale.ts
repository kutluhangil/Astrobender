import {
  PLANETARY_ELEMENTS,
  compressDistanceAu,
  heliocentricPositionAu,
  type PlanetaryBodyId,
} from './orbital-mechanics.ts'
import { EARTH_RADIUS_KM, bodyRadiusKm } from './body-comparison.ts'
import { findPlanetDef, type CelestialBodyId } from './planets.ts'

const AU_KM = 149_597_870.7
const SPEED_OF_LIGHT_KM_S = 299_792.458

/**
 * Sun sphere radius in Earth radii. The true value is about 109, which would
 * swallow Mercury's drawn orbit, so the Sun is the one body deliberately drawn far below its true size.
 */
export const SUN_SCENE_RADIUS = 2.5

/** Scene units the compression curve places one astronomical unit at. */
export const SCENE_UNITS_AT_ONE_AU = compressDistanceAu(1)

export interface ScaleHonesty {
  /** The body whose heliocentric distance is being described. */
  bodyId: PlanetaryBodyId
  /** True Sun-body distance right now, in astronomical units. */
  realAu: number
  /** Where the scene actually draws it, expressed back in astronomical units. */
  drawnAu: number
  /** drawnAu / realAu. A true-scale scene would hold this at exactly 1. */
  compression: number
}

function planetaryId(bodyId: CelestialBodyId): PlanetaryBodyId | null {
  if (bodyId === 'earth') return 'earth'
  if (bodyId === 'sun') return null
  const definition = findPlanetDef(bodyId)
  const candidate = definition?.parent ?? bodyId
  return candidate in PLANETARY_ELEMENTS ? (candidate as PlanetaryBodyId) : null
}

/**
 * How hard the compressed-AU curve is squeezing the focused body's orbit right
 * now. The scene keeps the ordering of the Solar System but not its
 * proportions, and this is the number that states by how much.
 *
 * Returns null for bodies with no heliocentric orbit of their own (the Sun,
 * and the Moon, which is described against Earth instead).
 */
export function getScaleHonesty(
  bodyId: CelestialBodyId,
  timeMs: number,
): ScaleHonesty | null {
  if (!Number.isFinite(timeMs)) throw new Error(`Invalid simulation time: ${timeMs}`)
  const id = planetaryId(bodyId)
  if (!id) return null

  const position = heliocentricPositionAu(id, timeMs)
  const realAu = Math.hypot(position.x, position.y, position.z)
  if (realAu === 0) return null

  const drawnAu = compressDistanceAu(realAu) / SCENE_UNITS_AT_ONE_AU
  return { bodyId: id, realAu, drawnAu, compression: drawnAu / realAu }
}

/**
 * Bar lengths for the scale ruler, both normalised against the same reference
 * so the two bars are directly comparable. The reference is the widest orbit
 * the scene draws, which keeps every body's pair of bars on one common axis.
 */
export interface ScaleRulerBars {
  /** 0..1 share of the reference orbit at true scale. */
  real: number
  /** 0..1 share of the reference orbit as drawn. */
  drawn: number
}

export function getScaleRulerBars(
  honesty: ScaleHonesty,
  referenceAu: number,
): ScaleRulerBars {
  if (!Number.isFinite(referenceAu) || referenceAu <= 0) {
    throw new Error(`Scale reference must be a positive AU value: ${referenceAu}`)
  }
  const drawnReference = compressDistanceAu(referenceAu) / SCENE_UNITS_AT_ONE_AU
  return {
    real: Math.min(1, honesty.realAu / referenceAu),
    drawn: Math.min(1, honesty.drawnAu / drawnReference),
  }
}

/** Neptune's semi-major axis: the outer edge of the classical planetary scene. */
export const SCALE_REFERENCE_AU = PLANETARY_ELEMENTS.neptune.semiMajorAxisAu.base

export interface LiveDistances {
  /** True Sun-body distance now; null for the Sun itself. */
  sunAu: number | null
  /** True Earth-body distance now; null for Earth itself. */
  earthAu: number | null
  /** One-way light travel time from Earth, in seconds; null for Earth. */
  lightSecondsFromEarth: number | null
}

/**
 * True distances at the simulation time, computed from the same Keplerian
 * elements the scene uses before compression. A moon reports its parent's
 * distances: the moon-to-planet offset is negligible at these ranges.
 */
export function getLiveDistances(bodyId: CelestialBodyId, timeMs: number): LiveDistances | null {
  if (!Number.isFinite(timeMs)) throw new Error(`Invalid simulation time: ${timeMs}`)
  const earth = heliocentricPositionAu('earth', timeMs)
  if (bodyId === 'sun') {
    const earthAu = Math.hypot(earth.x, earth.y, earth.z)
    return { sunAu: null, earthAu, lightSecondsFromEarth: (earthAu * AU_KM) / SPEED_OF_LIGHT_KM_S }
  }
  if (bodyId === 'earth') {
    return { sunAu: Math.hypot(earth.x, earth.y, earth.z), earthAu: null, lightSecondsFromEarth: null }
  }
  if (bodyId === 'moon') return null
  const id = planetaryId(bodyId)
  if (!id) return null
  const body = heliocentricPositionAu(id, timeMs)
  const earthAu = Math.hypot(body.x - earth.x, body.y - earth.y, body.z - earth.z)
  return {
    sunAu: Math.hypot(body.x, body.y, body.z),
    earthAu,
    lightSecondsFromEarth: (earthAu * AU_KM) / SPEED_OF_LIGHT_KM_S,
  }
}

export interface SizeHonesty {
  /** Catalogued radius in Earth radii. */
  trueRadius: number
  /** Radius of the drawn sphere in Earth radii (the scene unit). */
  drawnRadius: number
  /** drawnRadius / trueRadius; 1 means the body is drawn at true size. */
  ratio: number
}

/** How the drawn sphere compares with the catalogued radius; null when no sphere is defined. */
export function getSizeHonesty(bodyId: CelestialBodyId): SizeHonesty | null {
  const drawnRadius =
    bodyId === 'sun' ? SUN_SCENE_RADIUS : bodyId === 'earth' ? 1 : findPlanetDef(bodyId)?.radius
  if (drawnRadius === undefined) return null
  const trueRadius = bodyRadiusKm(bodyId) / EARTH_RADIUS_KM
  return { trueRadius, drawnRadius, ratio: drawnRadius / trueRadius }
}
