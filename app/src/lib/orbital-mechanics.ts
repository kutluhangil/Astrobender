export interface CartesianPosition {
  x: number
  y: number
  z: number
}

interface ElementWithRate {
  base: number
  ratePerCentury: number
}

export interface PlanetaryElements {
  semiMajorAxisAu: ElementWithRate
  eccentricity: ElementWithRate
  inclinationDeg: ElementWithRate
  meanLongitudeDeg: ElementWithRate
  longitudePerihelionDeg: ElementWithRate
  longitudeAscendingNodeDeg: ElementWithRate
}

export type PlanetaryBodyId =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'ceres'
  | 'haumea'
  | 'makemake'
  | 'eris'

export type SatelliteBodyId =
  | 'moon'
  | 'phobos'
  | 'deimos'
  | 'io'
  | 'europa'
  | 'ganymede'
  | 'callisto'
  | 'amalthea'
  | 'himalia'
  | 'enceladus'
  | 'titan'
  | 'pan'
  | 'mimas'
  | 'tethys'
  | 'dione'
  | 'rhea'
  | 'iapetus'
  | 'hyperion'
  | 'miranda'
  | 'ariel'
  | 'umbriel'
  | 'titania'
  | 'oberon'
  | 'larissa'
  | 'proteus'
  | 'nereid'
  | 'triton'
  | 'charon'
  | 'styx'
  | 'nix'
  | 'kerberos'
  | 'hydra'

export interface SatelliteElements {
  semiMajorAxisKm: number
  eccentricity: number
  argumentPeriapsisDeg: number
  meanAnomalyAtEpochDeg: number
  inclinationDeg: number
  longitudeAscendingNodeDeg: number
  periodDays: number
  referencePlaneTiltDeg: number
  kmPerSceneUnit: number
}

export const J2000_MS = Date.UTC(2000, 0, 1, 12)
const DAY_MS = 86_400_000
const DAYS_PER_JULIAN_CENTURY = 36_525
const J2000_OBLIQUITY_RAD = degreesToRadians(23.43928)
const SCENE_DISTANCE_AT_ONE_AU = 32
const SCENE_DISTANCE_EXPONENT = 0.58

const element = (base: number, ratePerCentury: number): ElementWithRate => ({
  base,
  ratePerCentury,
})

/**
 * JPL approximate planetary elements, valid from 1800 through 2050.
 * Pluto uses a J2000 approximation because JPL's major-planet table excludes it.
 */
export const PLANETARY_ELEMENTS: Record<PlanetaryBodyId, PlanetaryElements> = {
  mercury: {
    semiMajorAxisAu: element(0.38709927, 0.00000037),
    eccentricity: element(0.20563593, 0.00001906),
    inclinationDeg: element(7.00497902, -0.00594749),
    meanLongitudeDeg: element(252.2503235, 149472.67411175),
    longitudePerihelionDeg: element(77.45779628, 0.16047689),
    longitudeAscendingNodeDeg: element(48.33076593, -0.12534081),
  },
  venus: {
    semiMajorAxisAu: element(0.72333566, 0.0000039),
    eccentricity: element(0.00677672, -0.00004107),
    inclinationDeg: element(3.39467605, -0.0007889),
    meanLongitudeDeg: element(181.9790995, 58517.81538729),
    longitudePerihelionDeg: element(131.60246718, 0.00268329),
    longitudeAscendingNodeDeg: element(76.67984255, -0.27769418),
  },
  earth: {
    semiMajorAxisAu: element(1.00000261, 0.00000562),
    eccentricity: element(0.01671123, -0.00004392),
    inclinationDeg: element(-0.00001531, -0.01294668),
    meanLongitudeDeg: element(100.46457166, 35999.37244981),
    longitudePerihelionDeg: element(102.93768193, 0.32327364),
    longitudeAscendingNodeDeg: element(0, 0),
  },
  mars: {
    semiMajorAxisAu: element(1.52371034, 0.00001847),
    eccentricity: element(0.0933941, 0.00007882),
    inclinationDeg: element(1.84969142, -0.00813131),
    meanLongitudeDeg: element(-4.55343205, 19140.30268499),
    longitudePerihelionDeg: element(-23.94362959, 0.44441088),
    longitudeAscendingNodeDeg: element(49.55953891, -0.29257343),
  },
  jupiter: {
    semiMajorAxisAu: element(5.202887, -0.00011607),
    eccentricity: element(0.04838624, -0.00013253),
    inclinationDeg: element(1.30439695, -0.00183714),
    meanLongitudeDeg: element(34.39644051, 3034.74612775),
    longitudePerihelionDeg: element(14.72847983, 0.21252668),
    longitudeAscendingNodeDeg: element(100.47390909, 0.20469106),
  },
  saturn: {
    semiMajorAxisAu: element(9.53667594, -0.0012506),
    eccentricity: element(0.05386179, -0.00050991),
    inclinationDeg: element(2.48599187, 0.00193609),
    meanLongitudeDeg: element(49.95424423, 1222.49362201),
    longitudePerihelionDeg: element(92.59887831, -0.41897216),
    longitudeAscendingNodeDeg: element(113.66242448, -0.28867794),
  },
  uranus: {
    semiMajorAxisAu: element(19.18916464, -0.00196176),
    eccentricity: element(0.04725744, -0.00004397),
    inclinationDeg: element(0.77263783, -0.00242939),
    meanLongitudeDeg: element(313.23810451, 428.48202785),
    longitudePerihelionDeg: element(170.9542763, 0.40805281),
    longitudeAscendingNodeDeg: element(74.01692503, 0.04240589),
  },
  neptune: {
    semiMajorAxisAu: element(30.06992276, 0.00026291),
    eccentricity: element(0.00859048, 0.00005105),
    inclinationDeg: element(1.77004347, 0.00035372),
    meanLongitudeDeg: element(-55.12002969, 218.45945325),
    longitudePerihelionDeg: element(44.96476227, -0.32241464),
    longitudeAscendingNodeDeg: element(131.78422574, -0.00508664),
  },
  pluto: {
    semiMajorAxisAu: element(39.482, 0),
    eccentricity: element(0.2488, 0),
    inclinationDeg: element(17.16, 0),
    meanLongitudeDeg: element(238.93, 145.2078),
    longitudePerihelionDeg: element(224.07, 0),
    longitudeAscendingNodeDeg: element(110.3, 0),
  },
  ceres: {
    semiMajorAxisAu: element(2.7675, 0),
    eccentricity: element(0.0758, 0),
    inclinationDeg: element(10.59, 0),
    meanLongitudeDeg: element(95.99, 7821.1),
    longitudePerihelionDeg: element(73.6, 0),
    longitudeAscendingNodeDeg: element(80.3, 0),
  },
  haumea: {
    semiMajorAxisAu: element(43.13, 0),
    eccentricity: element(0.195, 0),
    inclinationDeg: element(28.19, 0),
    meanLongitudeDeg: element(211.7, 126.7),
    longitudePerihelionDeg: element(121.9, 0),
    longitudeAscendingNodeDeg: element(122.0, 0),
  },
  makemake: {
    semiMajorAxisAu: element(45.79, 0),
    eccentricity: element(0.159, 0),
    inclinationDeg: element(29.0, 0),
    meanLongitudeDeg: element(154.7, 117.55),
    longitudePerihelionDeg: element(294.8, 0),
    longitudeAscendingNodeDeg: element(79.6, 0),
  },
  eris: {
    semiMajorAxisAu: element(67.78, 0),
    eccentricity: element(0.44, 0),
    inclinationDeg: element(44.04, 0),
    meanLongitudeDeg: element(204.0, 64.52),
    longitudePerihelionDeg: element(151.6, 0),
    longitudeAscendingNodeDeg: element(35.95, 0),
  },
}

/**
 * Mean satellite orbit parameters compiled from NASA/JPL reference data.
 * The per-system scene scales preserve moon-to-moon distance ratios while
 * keeping each planetary system usable in an interactive browser scene.
 * Epoch phase is deterministic where a stable osculating phase is unavailable.
 */
export const SATELLITE_ELEMENTS: Record<SatelliteBodyId, SatelliteElements> = {
  moon: {
    semiMajorAxisKm: 384400,
    eccentricity: 0.0554,
    argumentPeriapsisDeg: 318.15,
    meanAnomalyAtEpochDeg: 135.27,
    inclinationDeg: 5.16,
    longitudeAscendingNodeDeg: 125.08,
    periodDays: 27.322,
    referencePlaneTiltDeg: 0,
    kmPerSceneUnit: 40463.15789473684,
  },
  phobos: {
    semiMajorAxisKm: 9375,
    eccentricity: 0.015,
    argumentPeriapsisDeg: 216.3,
    meanAnomalyAtEpochDeg: 189.7,
    inclinationDeg: 1.1,
    longitudeAscendingNodeDeg: 169.2,
    periodDays: 0.3187,
    referencePlaneTiltDeg: 25.19,
    kmPerSceneUnit: 11728.5,
  },
  deimos: {
    semiMajorAxisKm: 23457,
    eccentricity: 0,
    argumentPeriapsisDeg: 0,
    meanAnomalyAtEpochDeg: 205,
    inclinationDeg: 1.8,
    longitudeAscendingNodeDeg: 54.3,
    periodDays: 1.2625,
    referencePlaneTiltDeg: 25.19,
    kmPerSceneUnit: 11728.5,
  },
  io: {
    semiMajorAxisKm: 421800,
    eccentricity: 0.004,
    argumentPeriapsisDeg: 49.1,
    meanAnomalyAtEpochDeg: 330.9,
    inclinationDeg: 0,
    longitudeAscendingNodeDeg: 0,
    periodDays: 1.762732,
    referencePlaneTiltDeg: 3.13,
    kmPerSceneUnit: 188270,
  },
  europa: {
    semiMajorAxisKm: 671100,
    eccentricity: 0.009,
    argumentPeriapsisDeg: 45,
    meanAnomalyAtEpochDeg: 345.4,
    inclinationDeg: 0.5,
    longitudeAscendingNodeDeg: 184,
    periodDays: 3.525463,
    referencePlaneTiltDeg: 3.13,
    kmPerSceneUnit: 188270,
  },
  ganymede: {
    semiMajorAxisKm: 1070400,
    eccentricity: 0.001,
    argumentPeriapsisDeg: 198.3,
    meanAnomalyAtEpochDeg: 324.8,
    inclinationDeg: 0.2,
    longitudeAscendingNodeDeg: 58.5,
    periodDays: 7.155588,
    referencePlaneTiltDeg: 3.13,
    kmPerSceneUnit: 188270,
  },
  callisto: {
    semiMajorAxisKm: 1882700,
    eccentricity: 0.007,
    argumentPeriapsisDeg: 43.8,
    meanAnomalyAtEpochDeg: 87.4,
    inclinationDeg: 0.3,
    longitudeAscendingNodeDeg: 309.1,
    periodDays: 16.69044,
    referencePlaneTiltDeg: 3.13,
    kmPerSceneUnit: 188270,
  },
  amalthea: {
    semiMajorAxisKm: 181365,
    eccentricity: 0.0032,
    argumentPeriapsisDeg: 155,
    meanAnomalyAtEpochDeg: 40,
    inclinationDeg: 0.37,
    longitudeAscendingNodeDeg: 108,
    periodDays: 0.498179,
    referencePlaneTiltDeg: 3.13,
    kmPerSceneUnit: 188270,
  },
  himalia: {
    semiMajorAxisKm: 11460000,
    eccentricity: 0.16,
    argumentPeriapsisDeg: 332,
    meanAnomalyAtEpochDeg: 115,
    inclinationDeg: 27.5,
    longitudeAscendingNodeDeg: 45,
    periodDays: 250.56,
    referencePlaneTiltDeg: 3.13,
    kmPerSceneUnit: 188270,
  },
  enceladus: {
    semiMajorAxisKm: 238400,
    eccentricity: 0.005,
    argumentPeriapsisDeg: 119.5,
    meanAnomalyAtEpochDeg: 57,
    inclinationDeg: 0,
    longitudeAscendingNodeDeg: 0,
    periodDays: 1.370218,
    referencePlaneTiltDeg: 26.73,
    kmPerSceneUnit: 60000,
  },
  titan: {
    semiMajorAxisKm: 1221900,
    eccentricity: 0.029,
    argumentPeriapsisDeg: 78.3,
    meanAnomalyAtEpochDeg: 11.7,
    inclinationDeg: 0.3,
    longitudeAscendingNodeDeg: 78.6,
    periodDays: 15.945448,
    referencePlaneTiltDeg: 26.73,
    kmPerSceneUnit: 60000,
  },
  mimas: {
    semiMajorAxisKm: 185539,
    eccentricity: 0.0196,
    argumentPeriapsisDeg: 332,
    meanAnomalyAtEpochDeg: 14,
    inclinationDeg: 1.57,
    longitudeAscendingNodeDeg: 173,
    periodDays: 0.942422,
    referencePlaneTiltDeg: 26.73,
    kmPerSceneUnit: 60000,
  },
  tethys: {
    semiMajorAxisKm: 294619,
    eccentricity: 0.0001,
    argumentPeriapsisDeg: 45,
    meanAnomalyAtEpochDeg: 201,
    inclinationDeg: 1.12,
    longitudeAscendingNodeDeg: 259,
    periodDays: 1.887802,
    referencePlaneTiltDeg: 26.73,
    kmPerSceneUnit: 60000,
  },
  dione: {
    semiMajorAxisKm: 377396,
    eccentricity: 0.0022,
    argumentPeriapsisDeg: 284,
    meanAnomalyAtEpochDeg: 86,
    inclinationDeg: 0.02,
    longitudeAscendingNodeDeg: 168,
    periodDays: 2.736915,
    referencePlaneTiltDeg: 26.73,
    kmPerSceneUnit: 60000,
  },
  rhea: {
    semiMajorAxisKm: 527108,
    eccentricity: 0.001,
    argumentPeriapsisDeg: 241,
    meanAnomalyAtEpochDeg: 235,
    inclinationDeg: 0.35,
    longitudeAscendingNodeDeg: 12,
    periodDays: 4.518212,
    referencePlaneTiltDeg: 26.73,
    kmPerSceneUnit: 60000,
  },
  iapetus: {
    semiMajorAxisKm: 3560820,
    eccentricity: 0.0283,
    argumentPeriapsisDeg: 275,
    meanAnomalyAtEpochDeg: 348,
    inclinationDeg: 15.47,
    longitudeAscendingNodeDeg: 75,
    periodDays: 79.3215,
    referencePlaneTiltDeg: 26.73,
    kmPerSceneUnit: 60000,
  },
  pan: {
    semiMajorAxisKm: 133584,
    eccentricity: 0.00001,
    argumentPeriapsisDeg: 0,
    meanAnomalyAtEpochDeg: 260,
    inclinationDeg: 0.001,
    longitudeAscendingNodeDeg: 0,
    periodDays: 0.57505,
    referencePlaneTiltDeg: 26.73,
    kmPerSceneUnit: 60000,
  },
  hyperion: {
    semiMajorAxisKm: 1481009,
    eccentricity: 0.123,
    argumentPeriapsisDeg: 264,
    meanAnomalyAtEpochDeg: 170,
    inclinationDeg: 0.43,
    longitudeAscendingNodeDeg: 168,
    periodDays: 21.2766,
    referencePlaneTiltDeg: 26.73,
    kmPerSceneUnit: 60000,
  },
  miranda: {
    semiMajorAxisKm: 129390,
    eccentricity: 0.0013,
    argumentPeriapsisDeg: 68,
    meanAnomalyAtEpochDeg: 311,
    inclinationDeg: 4.34,
    longitudeAscendingNodeDeg: 326,
    periodDays: 1.413479,
    referencePlaneTiltDeg: 97.77,
    kmPerSceneUnit: 129669.11111111111,
  },
  ariel: {
    semiMajorAxisKm: 190900,
    eccentricity: 0.0012,
    argumentPeriapsisDeg: 115,
    meanAnomalyAtEpochDeg: 39,
    inclinationDeg: 0.26,
    longitudeAscendingNodeDeg: 23,
    periodDays: 2.520379,
    referencePlaneTiltDeg: 97.77,
    kmPerSceneUnit: 129669.11111111111,
  },
  umbriel: {
    semiMajorAxisKm: 266000,
    eccentricity: 0.0039,
    argumentPeriapsisDeg: 84,
    meanAnomalyAtEpochDeg: 174,
    inclinationDeg: 0.13,
    longitudeAscendingNodeDeg: 34,
    periodDays: 4.144177,
    referencePlaneTiltDeg: 97.77,
    kmPerSceneUnit: 129669.11111111111,
  },
  titania: {
    semiMajorAxisKm: 436298,
    eccentricity: 0.002,
    argumentPeriapsisDeg: 184,
    meanAnomalyAtEpochDeg: 68.1,
    inclinationDeg: 0.1,
    longitudeAscendingNodeDeg: 29.5,
    periodDays: 8.705869,
    referencePlaneTiltDeg: 97.77,
    kmPerSceneUnit: 129669.11111111111,
  },
  oberon: {
    semiMajorAxisKm: 583511,
    eccentricity: 0.002,
    argumentPeriapsisDeg: 132.2,
    meanAnomalyAtEpochDeg: 143.6,
    inclinationDeg: 0.1,
    longitudeAscendingNodeDeg: 76.8,
    periodDays: 13.463237,
    referencePlaneTiltDeg: 97.77,
    kmPerSceneUnit: 129669.11111111111,
  },
  larissa: {
    semiMajorAxisKm: 73548,
    eccentricity: 0.0014,
    argumentPeriapsisDeg: 0,
    meanAnomalyAtEpochDeg: 212,
    inclinationDeg: 0.2,
    longitudeAscendingNodeDeg: 0,
    periodDays: 0.55465,
    referencePlaneTiltDeg: 28.32,
    kmPerSceneUnit: 101371.42857142857,
  },
  triton: {
    semiMajorAxisKm: 354800,
    eccentricity: 0,
    argumentPeriapsisDeg: 0,
    meanAnomalyAtEpochDeg: 63,
    inclinationDeg: 157.3,
    longitudeAscendingNodeDeg: 178.1,
    periodDays: 5.876994,
    referencePlaneTiltDeg: 28.32,
    kmPerSceneUnit: 101371.42857142857,
  },
  proteus: {
    semiMajorAxisKm: 117646,
    eccentricity: 0.0005,
    argumentPeriapsisDeg: 0,
    meanAnomalyAtEpochDeg: 94,
    inclinationDeg: 0.08,
    longitudeAscendingNodeDeg: 0,
    periodDays: 1.122315,
    referencePlaneTiltDeg: 28.32,
    kmPerSceneUnit: 101371.42857142857,
  },
  nereid: {
    semiMajorAxisKm: 5513400,
    eccentricity: 0.7507,
    argumentPeriapsisDeg: 296,
    meanAnomalyAtEpochDeg: 129,
    inclinationDeg: 7.23,
    longitudeAscendingNodeDeg: 320,
    periodDays: 360.136,
    referencePlaneTiltDeg: 28.32,
    kmPerSceneUnit: 101371.42857142857,
  },
  charon: {
    semiMajorAxisKm: 19596,
    eccentricity: 0.0002,
    argumentPeriapsisDeg: 0,
    meanAnomalyAtEpochDeg: 231,
    inclinationDeg: 0,
    longitudeAscendingNodeDeg: 0,
    periodDays: 6.38723,
    referencePlaneTiltDeg: 122.53,
    kmPerSceneUnit: 5000,
  },
  styx: {
    semiMajorAxisKm: 42656,
    eccentricity: 0.0058,
    argumentPeriapsisDeg: 0,
    meanAnomalyAtEpochDeg: 80,
    inclinationDeg: 0.8,
    longitudeAscendingNodeDeg: 0,
    periodDays: 20.16155,
    referencePlaneTiltDeg: 122.53,
    kmPerSceneUnit: 5000,
  },
  nix: {
    semiMajorAxisKm: 48694,
    eccentricity: 0.002,
    argumentPeriapsisDeg: 0,
    meanAnomalyAtEpochDeg: 155,
    inclinationDeg: 0.1,
    longitudeAscendingNodeDeg: 0,
    periodDays: 24.85463,
    referencePlaneTiltDeg: 122.53,
    kmPerSceneUnit: 5000,
  },
  kerberos: {
    semiMajorAxisKm: 57783,
    eccentricity: 0.003,
    argumentPeriapsisDeg: 0,
    meanAnomalyAtEpochDeg: 225,
    inclinationDeg: 0.4,
    longitudeAscendingNodeDeg: 0,
    periodDays: 32.16756,
    referencePlaneTiltDeg: 122.53,
    kmPerSceneUnit: 5000,
  },
  hydra: {
    semiMajorAxisKm: 64738,
    eccentricity: 0.0059,
    argumentPeriapsisDeg: 0,
    meanAnomalyAtEpochDeg: 300,
    inclinationDeg: 0.2,
    longitudeAscendingNodeDeg: 0,
    periodDays: 38.20177,
    referencePlaneTiltDeg: 122.53,
    kmPerSceneUnit: 5000,
  },
}

function degreesToRadians(value: number): number {
  return value * (Math.PI / 180)
}

function normalizeRadians(value: number): number {
  const twoPi = Math.PI * 2
  return ((value + Math.PI) % twoPi + twoPi) % twoPi - Math.PI
}

function solveEccentricAnomaly(meanAnomalyRad: number, eccentricity: number): number {
  if (!Number.isFinite(meanAnomalyRad) || !Number.isFinite(eccentricity)) {
    throw new Error(`Invalid Kepler input: meanAnomaly=${meanAnomalyRad}, eccentricity=${eccentricity}`)
  }
  if (eccentricity < 0 || eccentricity >= 1) {
    throw new Error(`Elliptical eccentricity must be in [0, 1): ${eccentricity}`)
  }

  const mean = normalizeRadians(meanAnomalyRad)
  let eccentricAnomaly = mean + eccentricity * Math.sin(mean)
  for (let iteration = 0; iteration < 12; iteration++) {
    const delta =
      (mean - (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly))) /
      (1 - eccentricity * Math.cos(eccentricAnomaly))
    eccentricAnomaly += delta
    if (Math.abs(delta) <= 1e-12) return eccentricAnomaly
  }

  throw new Error(
    `Kepler solver did not converge: meanAnomaly=${meanAnomalyRad}, eccentricity=${eccentricity}`,
  )
}

function rotateOrbitalPlane(
  xPrime: number,
  yPrime: number,
  argumentPeriapsisRad: number,
  inclinationRad: number,
  ascendingNodeRad: number,
): CartesianPosition {
  const cosArgument = Math.cos(argumentPeriapsisRad)
  const sinArgument = Math.sin(argumentPeriapsisRad)
  const cosInclination = Math.cos(inclinationRad)
  const sinInclination = Math.sin(inclinationRad)
  const cosNode = Math.cos(ascendingNodeRad)
  const sinNode = Math.sin(ascendingNodeRad)

  return {
    x:
      (cosArgument * cosNode - sinArgument * sinNode * cosInclination) * xPrime +
      (-sinArgument * cosNode - cosArgument * sinNode * cosInclination) * yPrime,
    y:
      (cosArgument * sinNode + sinArgument * cosNode * cosInclination) * xPrime +
      (-sinArgument * sinNode + cosArgument * cosNode * cosInclination) * yPrime,
    z: sinArgument * sinInclination * xPrime + cosArgument * sinInclination * yPrime,
  }
}

function rotateAroundX(position: CartesianPosition, angleRad: number): CartesianPosition {
  const cosAngle = Math.cos(angleRad)
  const sinAngle = Math.sin(angleRad)
  return {
    x: position.x,
    y: cosAngle * position.y - sinAngle * position.z,
    z: sinAngle * position.y + cosAngle * position.z,
  }
}

function valueAtCentury(elementValue: ElementWithRate, centuriesSinceJ2000: number): number {
  return elementValue.base + elementValue.ratePerCentury * centuriesSinceJ2000
}

function planetaryPositionForMeanAnomaly(
  elements: PlanetaryElements,
  centuriesSinceJ2000: number,
  meanAnomalyOverrideRad?: number,
): CartesianPosition {
  const semiMajorAxis = valueAtCentury(elements.semiMajorAxisAu, centuriesSinceJ2000)
  const eccentricity = valueAtCentury(elements.eccentricity, centuriesSinceJ2000)
  const inclination = degreesToRadians(
    valueAtCentury(elements.inclinationDeg, centuriesSinceJ2000),
  )
  const longitudePerihelion = degreesToRadians(
    valueAtCentury(elements.longitudePerihelionDeg, centuriesSinceJ2000),
  )
  const ascendingNode = degreesToRadians(
    valueAtCentury(elements.longitudeAscendingNodeDeg, centuriesSinceJ2000),
  )
  const meanLongitude = degreesToRadians(
    valueAtCentury(elements.meanLongitudeDeg, centuriesSinceJ2000),
  )
  const argumentPeriapsis = longitudePerihelion - ascendingNode
  const meanAnomaly = meanAnomalyOverrideRad ?? meanLongitude - longitudePerihelion
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, eccentricity)
  const xPrime = semiMajorAxis * (Math.cos(eccentricAnomaly) - eccentricity)
  const yPrime =
    semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(eccentricAnomaly)
  const ecliptic = rotateOrbitalPlane(
    xPrime,
    yPrime,
    argumentPeriapsis,
    inclination,
    ascendingNode,
  )

  return rotateAroundX(ecliptic, J2000_OBLIQUITY_RAD)
}

export function heliocentricPositionAu(
  bodyId: PlanetaryBodyId,
  timeMs: number,
): CartesianPosition {
  if (!Number.isFinite(timeMs)) throw new Error(`Invalid simulation time: ${timeMs}`)
  const elements = PLANETARY_ELEMENTS[bodyId]
  if (!elements) throw new Error(`Missing planetary elements for: ${bodyId}`)
  const centuriesSinceJ2000 = (timeMs - J2000_MS) / DAY_MS / DAYS_PER_JULIAN_CENTURY
  return planetaryPositionForMeanAnomaly(elements, centuriesSinceJ2000)
}

export function compressDistanceAu(distanceAu: number): number {
  if (!Number.isFinite(distanceAu) || distanceAu < 0) {
    throw new Error(`Distance must be a finite non-negative AU value: ${distanceAu}`)
  }
  if (distanceAu === 0) return 0
  return SCENE_DISTANCE_AT_ONE_AU * Math.pow(distanceAu, SCENE_DISTANCE_EXPONENT)
}

export function compressHeliocentricPosition(position: CartesianPosition): CartesianPosition {
  const distanceAu = Math.hypot(position.x, position.y, position.z)
  if (distanceAu === 0) return { x: 0, y: 0, z: 0 }
  const scale = compressDistanceAu(distanceAu) / distanceAu
  return {
    x: position.x * scale,
    y: position.y * scale,
    z: position.z * scale,
  }
}

export function getGeocentricScenePositions(
  timeMs: number,
): Record<PlanetaryBodyId | 'sun', CartesianPosition> {
  const heliocentric = Object.fromEntries(
    (Object.keys(PLANETARY_ELEMENTS) as PlanetaryBodyId[]).map((bodyId) => [
      bodyId,
      compressHeliocentricPosition(heliocentricPositionAu(bodyId, timeMs)),
    ]),
  ) as Record<PlanetaryBodyId, CartesianPosition>
  const earth = heliocentric.earth
  const fromEarth = (position: CartesianPosition): CartesianPosition => ({
    x: position.x - earth.x,
    y: position.y - earth.y,
    z: position.z - earth.z,
  })

  return {
    sun: fromEarth({ x: 0, y: 0, z: 0 }),
    mercury: fromEarth(heliocentric.mercury),
    venus: fromEarth(heliocentric.venus),
    earth: { x: 0, y: 0, z: 0 },
    mars: fromEarth(heliocentric.mars),
    jupiter: fromEarth(heliocentric.jupiter),
    saturn: fromEarth(heliocentric.saturn),
    uranus: fromEarth(heliocentric.uranus),
    neptune: fromEarth(heliocentric.neptune),
    pluto: fromEarth(heliocentric.pluto),
    ceres: fromEarth(heliocentric.ceres),
    haumea: fromEarth(heliocentric.haumea),
    makemake: fromEarth(heliocentric.makemake),
    eris: fromEarth(heliocentric.eris),
  }
}

function satellitePositionForMeanAnomaly(
  elements: SatelliteElements,
  meanAnomalyRad: number,
): CartesianPosition {
  const semiMajorAxisScene = elements.semiMajorAxisKm / elements.kmPerSceneUnit
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomalyRad, elements.eccentricity)
  const xPrime =
    semiMajorAxisScene * (Math.cos(eccentricAnomaly) - elements.eccentricity)
  const yPrime =
    semiMajorAxisScene *
    Math.sqrt(1 - elements.eccentricity * elements.eccentricity) *
    Math.sin(eccentricAnomaly)
  const localPlane = rotateOrbitalPlane(
    xPrime,
    yPrime,
    degreesToRadians(elements.argumentPeriapsisDeg),
    degreesToRadians(elements.inclinationDeg),
    degreesToRadians(elements.longitudeAscendingNodeDeg),
  )

  return rotateAroundX(localPlane, degreesToRadians(elements.referencePlaneTiltDeg))
}

export function getSatelliteScenePosition(
  bodyId: SatelliteBodyId,
  timeMs: number,
): CartesianPosition {
  if (!Number.isFinite(timeMs)) throw new Error(`Invalid simulation time: ${timeMs}`)
  const elements = SATELLITE_ELEMENTS[bodyId]
  if (!elements) throw new Error(`Missing satellite elements for: ${bodyId}`)
  const elapsedDays = (timeMs - J2000_MS) / DAY_MS
  const meanAnomaly =
    degreesToRadians(elements.meanAnomalyAtEpochDeg) +
    (elapsedDays / elements.periodDays) * Math.PI * 2
  return satellitePositionForMeanAnomaly(elements, meanAnomaly)
}

export function samplePlanetOrbitScene(
  bodyId: PlanetaryBodyId,
  timeMs: number,
  segments: number,
): CartesianPosition[] {
  if (!Number.isInteger(segments) || segments < 3) {
    throw new Error(`Orbit segments must be an integer >= 3: ${segments}`)
  }
  const centuriesSinceJ2000 = (timeMs - J2000_MS) / DAY_MS / DAYS_PER_JULIAN_CENTURY
  const elements = PLANETARY_ELEMENTS[bodyId]
  const points: CartesianPosition[] = []
  for (let index = 0; index <= segments; index++) {
    const meanAnomaly = (index / segments) * Math.PI * 2
    points.push(
      compressHeliocentricPosition(
        planetaryPositionForMeanAnomaly(elements, centuriesSinceJ2000, meanAnomaly),
      ),
    )
  }
  return points
}

export function sampleSatelliteOrbitScene(
  bodyId: SatelliteBodyId,
  segments: number,
): CartesianPosition[] {
  if (!Number.isInteger(segments) || segments < 3) {
    throw new Error(`Orbit segments must be an integer >= 3: ${segments}`)
  }
  const elements = SATELLITE_ELEMENTS[bodyId]
  const points: CartesianPosition[] = []
  for (let index = 0; index <= segments; index++) {
    points.push(
      satellitePositionForMeanAnomaly(elements, (index / segments) * Math.PI * 2),
    )
  }
  return points
}
