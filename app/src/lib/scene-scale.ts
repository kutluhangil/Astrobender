import {
  PLANETARY_ELEMENTS,
  compressDistanceAu,
  heliocentricPositionAu,
  type PlanetaryBodyId,
} from './orbital-mechanics.ts'
import { findPlanetDef, type CelestialBodyId } from './planets.ts'

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
