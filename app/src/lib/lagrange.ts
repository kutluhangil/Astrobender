import {
  compressDistanceAu,
  compressHeliocentricPosition,
  heliocentricPositionAu,
  type CartesianPosition,
  type PlanetaryBodyId,
} from './orbital-mechanics.ts'

export const NASA_LAGRANGE_URL = 'https://science.nasa.gov/resource/what-is-a-lagrange-point/'
export const MPC_TROJAN_URL = 'https://www.minorplanetcenter.net/iau/lists/JupiterTrojans.html'

/**
 * Mass ratios μ = m_secondary / (m_primary + m_secondary), from the JPL
 * planetary physical parameters table with the Sun at 1.98847 × 10^30 kg.
 */
const SUN_MASS_KG = 1.98847e30
const SECONDARY_MASS_KG: Partial<Record<PlanetaryBodyId, number>> = {
  earth: 5.9722e24,
  jupiter: 1.89813e27,
}

export type LagrangePointId = 'L1' | 'L2' | 'L4' | 'L5'

export interface LagrangePoint {
  id: LagrangePointId
  /** The body the point belongs to, e.g. the Sun-Earth system's secondary. */
  secondary: PlanetaryBodyId
  labelTr: string
  labelEn: string
  /** Missions parked there, empty when none are modelled. */
  occupants: readonly string[]
}

export const LAGRANGE_POINTS: readonly LagrangePoint[] = [
  {
    id: 'L1',
    secondary: 'earth',
    labelTr: 'Güneş–Dünya L1',
    labelEn: 'Sun-Earth L1',
    occupants: ['SOHO', 'DSCOVR'],
  },
  {
    id: 'L2',
    secondary: 'earth',
    labelTr: 'Güneş–Dünya L2',
    labelEn: 'Sun-Earth L2',
    occupants: ['James Webb Space Telescope', 'Euclid', 'Gaia'],
  },
  { id: 'L4', secondary: 'earth', labelTr: 'Güneş–Dünya L4', labelEn: 'Sun-Earth L4', occupants: [] },
  { id: 'L5', secondary: 'earth', labelTr: 'Güneş–Dünya L5', labelEn: 'Sun-Earth L5', occupants: [] },
  {
    id: 'L4',
    secondary: 'jupiter',
    labelTr: 'Güneş–Jüpiter L4 (Yunan kampı)',
    labelEn: 'Sun-Jupiter L4 (Greek camp)',
    occupants: [],
  },
  {
    id: 'L5',
    secondary: 'jupiter',
    labelTr: 'Güneş–Jüpiter L5 (Truva kampı)',
    labelEn: 'Sun-Jupiter L5 (Trojan camp)',
    occupants: [],
  },
]

export function massRatio(secondary: PlanetaryBodyId): number {
  const mass = SECONDARY_MASS_KG[secondary]
  if (mass === undefined) throw new Error(`No mass on record for Lagrange secondary: ${secondary}`)
  return mass / (SUN_MASS_KG + mass)
}

/**
 * Signed collinear-point offset from the secondary, as a fraction of its
 * orbital radius, to third order in the Hill radius (Murray & Dermott). L1 is
 * sunward, so its fraction is negative. The first-order term alone would put L1
 * and L2 at the same distance, which they are not: Sun-Earth L1 sits at about
 * 1.4915 million km and L2 at about 1.5015 million km.
 */
export function collinearOffsetFraction(secondary: PlanetaryBodyId, point: 'L1' | 'L2'): number {
  const hill = Math.cbrt(massRatio(secondary) / 3)
  const towardSun = point === 'L1'
  const series = towardSun
    ? 1 - hill / 3 - (hill * hill) / 9 - (23 * hill * hill * hill) / 81
    : 1 + hill / 3 - (hill * hill) / 9 - (31 * hill * hill * hill) / 81
  return (towardSun ? -1 : 1) * hill * series
}

/**
 * Scene distance the collinear points are drawn at, in units of the Earth's
 * own scene radius. At their true compressed distance both would fall inside
 * the Earth sphere, so they are pushed out to a fixed, disclosed offset and
 * `getCollinearExaggeration` reports exactly how far that overstates them.
 */
export const LAGRANGE_COLLINEAR_SCENE_OFFSET = 3.2

export interface LagrangeScenePoint extends LagrangePoint {
  /** Heliocentric position in au, before the scene's distance compression. */
  heliocentricAu: CartesianPosition
  /** Distance from the secondary body in kilometres. */
  offsetKm: number
  /**
   * True for the collinear points, whose true compressed offset is smaller than
   * the secondary's own drawn radius. They are pushed out to a fixed scene
   * offset instead, and the exaggeration is reported alongside them.
   */
  drawnOnSecondaryScale: boolean
}

const AU_KM = 149_597_870.7

function cross(a: CartesianPosition, b: CartesianPosition): CartesianPosition {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

function normalize(vector: CartesianPosition): CartesianPosition {
  const length = Math.hypot(vector.x, vector.y, vector.z)
  if (length === 0) throw new Error('Cannot normalize a zero-length vector')
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length }
}

/** Rodrigues rotation of a vector about an arbitrary unit axis. */
function rotateAboutAxis(
  position: CartesianPosition,
  axis: CartesianPosition,
  angleRad: number,
): CartesianPosition {
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  const dot = axis.x * position.x + axis.y * position.y + axis.z * position.z
  const perpendicular = cross(axis, position)
  return {
    x: position.x * cos + perpendicular.x * sin + axis.x * dot * (1 - cos),
    y: position.y * cos + perpendicular.y * sin + axis.y * dot * (1 - cos),
    z: position.z * cos + perpendicular.z * sin + axis.z * dot * (1 - cos),
  }
}

const ORBIT_NORMAL_STEP_MS = 86_400_000

/**
 * Normal of the secondary's orbital plane, taken from two positions a day
 * apart. L4 and L5 are defined in that plane, so rotating about the equatorial
 * or ecliptic pole instead would miss the 60° separation by the orbit's own
 * inclination.
 */
function orbitNormal(secondary: PlanetaryBodyId, timeMs: number): CartesianPosition {
  const here = heliocentricPositionAu(secondary, timeMs)
  const ahead = heliocentricPositionAu(secondary, timeMs + ORBIT_NORMAL_STEP_MS)
  return normalize(cross(here, ahead))
}

/**
 * Positions of every modelled Lagrange point at one instant. L4 and L5 lead and
 * trail the secondary by 60° on its own orbit, so the heliocentric scale shows
 * them honestly; L1 and L2 sit a hundredth of an au away and would vanish into
 * the secondary at that scale.
 */
export function getLagrangePoints(timeMs: number): LagrangeScenePoint[] {
  if (!Number.isFinite(timeMs)) throw new Error(`Invalid Lagrange time: ${timeMs}`)
  return LAGRANGE_POINTS.map((point) => {
    const secondary = heliocentricPositionAu(point.secondary, timeMs)
    const orbitRadiusAu = Math.hypot(secondary.x, secondary.y, secondary.z)

    if (point.id === 'L4' || point.id === 'L5') {
      const angle = (point.id === 'L4' ? 60 : -60) * (Math.PI / 180)
      return {
        ...point,
        heliocentricAu: rotateAboutAxis(secondary, orbitNormal(point.secondary, timeMs), angle),
        offsetKm: orbitRadiusAu * AU_KM,
        drawnOnSecondaryScale: false,
      }
    }

    const fraction = collinearOffsetFraction(point.secondary, point.id)
    const scale = 1 + fraction
    return {
      ...point,
      heliocentricAu: {
        x: secondary.x * scale,
        y: secondary.y * scale,
        z: secondary.z * scale,
      },
      offsetKm: orbitRadiusAu * fraction * AU_KM,
      drawnOnSecondaryScale: true,
    }
  })
}

/**
 * Scene position for a Lagrange point in the Earth-centred scene. Collinear
 * points are placed on the Earth-system ruler; the triangular points ride the
 * compressed heliocentric curve like any other orbiting body.
 */
export function getLagrangeScenePosition(
  point: LagrangeScenePoint,
  timeMs: number,
): CartesianPosition {
  const earthScene = compressHeliocentricPosition(heliocentricPositionAu('earth', timeMs))
  if (!point.drawnOnSecondaryScale) {
    const scene = compressHeliocentricPosition(point.heliocentricAu)
    return {
      x: scene.x - earthScene.x,
      y: scene.y - earthScene.y,
      z: scene.z - earthScene.z,
    }
  }

  const secondary = heliocentricPositionAu(point.secondary, timeMs)
  const radiusAu = Math.hypot(secondary.x, secondary.y, secondary.z)
  if (radiusAu === 0) throw new Error(`Lagrange secondary has no orbit: ${point.secondary}`)
  const direction = Math.sign(point.offsetKm)
  const secondaryScene = compressHeliocentricPosition(secondary)
  const outward = {
    x: secondary.x / radiusAu,
    y: secondary.y / radiusAu,
    z: secondary.z / radiusAu,
  }
  const offset = LAGRANGE_COLLINEAR_SCENE_OFFSET * direction
  return {
    x: secondaryScene.x - earthScene.x + outward.x * offset,
    y: secondaryScene.y - earthScene.y + outward.y * offset,
    z: secondaryScene.z - earthScene.z + outward.z * offset,
  }
}

/**
 * How many times further from its secondary a collinear point is drawn than
 * the compressed scale would place it. Reported in the interface so the
 * exaggeration is stated rather than assumed.
 */
export function getCollinearExaggeration(
  point: LagrangeScenePoint,
  timeMs: number,
): number {
  if (!point.drawnOnSecondaryScale) return 1
  const secondary = heliocentricPositionAu(point.secondary, timeMs)
  const radiusAu = Math.hypot(secondary.x, secondary.y, secondary.z)
  const fraction = point.offsetKm / (radiusAu * AU_KM)
  const trueOffsetUnits = Math.abs(
    compressDistanceAu(radiusAu * (1 + fraction)) - compressDistanceAu(radiusAu),
  )
  if (trueOffsetUnits === 0) throw new Error(`Degenerate Lagrange offset for ${point.labelEn}`)
  return LAGRANGE_COLLINEAR_SCENE_OFFSET / trueOffsetUnits
}

export const TROJAN_CLOUD_COUNT = 240
/** Longitude spread of each camp around its Lagrange point, in degrees. */
export const TROJAN_LIBRATION_DEG = 26
/** Inclination spread of the camps, in degrees. */
export const TROJAN_INCLINATION_DEG = 14

function deterministicUnit(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

/**
 * A schematic Jupiter Trojan camp. The Minor Planet Center lists tens of
 * thousands of individual Trojans; this draws the statistical shape of a camp
 * — its libration and inclination spread — and is labelled as schematic rather
 * than presented as catalogued positions.
 */
export function sampleTrojanCloud(
  point: LagrangeScenePoint,
  timeMs: number,
  count = TROJAN_CLOUD_COUNT,
): CartesianPosition[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`Trojan cloud count must be a positive integer: ${count}`)
  }
  if (point.secondary !== 'jupiter') {
    throw new Error(`Trojan camps are modelled for Jupiter only, not ${point.secondary}`)
  }
  const earthScene = compressHeliocentricPosition(heliocentricPositionAu('earth', timeMs))
  const normal = orbitNormal(point.secondary, timeMs)
  const samples: CartesianPosition[] = []
  for (let index = 0; index < count; index++) {
    const libration =
      (deterministicUnit(index, 1) - 0.5) * 2 * TROJAN_LIBRATION_DEG * (Math.PI / 180)
    const inclination =
      (deterministicUnit(index, 2) - 0.5) * 2 * TROJAN_INCLINATION_DEG * (Math.PI / 180)
    const radialJitter = 1 + (deterministicUnit(index, 3) - 0.5) * 0.12

    // Libration runs along the orbit; the inclination spread then lifts each
    // member out of the orbital plane by rotating it about the along-track axis.
    const alongOrbit = rotateAboutAxis(point.heliocentricAu, normal, libration)
    const alongTrack = normalize(cross(normal, normalize(alongOrbit)))
    const lifted = rotateAboutAxis(alongOrbit, alongTrack, inclination)
    const scene = compressHeliocentricPosition({
      x: lifted.x * radialJitter,
      y: lifted.y * radialJitter,
      z: lifted.z * radialJitter,
    })
    samples.push({
      x: scene.x - earthScene.x,
      y: scene.y - earthScene.y,
      z: scene.z - earthScene.z,
    })
  }
  return samples
}
