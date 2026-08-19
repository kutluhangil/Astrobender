/** All celestial body identifiers in the ASTROBENDER Solar System */
export type CelestialBodyId =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'moon'
  | 'mars'
  | 'phobos'
  | 'deimos'
  | 'jupiter'
  | 'io'
  | 'europa'
  | 'ganymede'
  | 'callisto'
  | 'amalthea'
  | 'himalia'
  | 'saturn'
  | 'pan'
  | 'titan'
  | 'enceladus'
  | 'mimas'
  | 'tethys'
  | 'dione'
  | 'rhea'
  | 'iapetus'
  | 'hyperion'
  | 'uranus'
  | 'miranda'
  | 'ariel'
  | 'umbriel'
  | 'titania'
  | 'oberon'
  | 'neptune'
  | 'larissa'
  | 'proteus'
  | 'nereid'
  | 'triton'
  | 'pluto'
  | 'charon'
  | 'styx'
  | 'nix'
  | 'kerberos'
  | 'hydra'
  | 'ceres'
  | 'haumea'
  | 'makemake'
  | 'eris'

/** Planet definition used by the UI and engine */
export interface PlanetDef {
  id: CelestialBodyId
  name: string
  emoji: string
  /** Scene-unit radius of the 3D sphere */
  radius: number
  /** Sphere geometry segments (detail) */
  segments: number
  /** Texture file name (in /textures/) */
  texture?: string
  /** Conservative color correction applied to the surface texture */
  surfaceTint?: [number, number, number]
  /** Non-spherical body proportions */
  shapeScale?: [number, number, number]
  /** Optional bump map file name */
  bump?: string
  /** Real heliocentric semi-major axis in astronomical units */
  semiMajorAxisAu?: number
  /** Real parent-centric semi-major axis in kilometers */
  semiMajorAxisKm?: number
  /** Orbital period in Earth days */
  orbitPeriodDays: number
  /** Self-rotation period in hours */
  rotationPeriodHours: number
  /** Axial tilt in degrees */
  axialTilt: number
  /** Orbital inclination in degrees */
  inclination: number
  /** Atmosphere rim glow color [r,g,b] 0-1 range, or null */
  atmosphereColor: [number, number, number] | null
  /** Atmosphere rim glow intensity */
  atmosphereIntensity: number
  /** Active color for the UI button (tailwind class fragment) */
  uiColor: string
  /** Active shadow glow for UI (tailwind class fragment) */
  uiGlow: string
  /** Visible ring system; distances are ratios of the body's scene radius. */
  ring?: {
    innerRadius: number
    outerRadius: number
    color: number
    opacity: number
    texture?: string
  }
  /** Current confirmed moon count; unmodeled moons render as low-cost points. */
  knownMoonCount?: number
  /** Child moons (orbit around this planet, not Sun) */
  moons?: PlanetDef[]
  /** Is it retrograde rotation? */
  retrograde?: boolean
  /** Parent body ID (for moons) */
  parent?: CelestialBodyId
}

// Positions use JPL Keplerian elements in orbital-mechanics.ts. Heliocentric
// distances share one monotonic compression curve so the full system remains
// navigable; moons preserve their real distance ratios within each system.

interface MajorMoonInput {
  id: CelestialBodyId
  name: string
  radius: number
  semiMajorAxisKm: number
  orbitPeriodDays: number
  inclination: number
  parent: CelestialBodyId
  color: [number, number, number]
}

function majorMoon(input: MajorMoonInput): PlanetDef {
  return {
    ...input,
    emoji: '🌑',
    segments: 32,
    rotationPeriodHours: input.orbitPeriodDays * 24,
    axialTilt: 0,
    atmosphereColor: null,
    atmosphereIntensity: 0,
    surfaceTint: input.color,
    uiColor: 'border-slate-400/40 bg-slate-400/10 text-slate-300',
    uiGlow: '',
  }
}

export const PLANETS: PlanetDef[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    emoji: '🪨',
    radius: 0.38,
    segments: 64,
    texture: 'mercury-4k.jpg',
    semiMajorAxisAu: 0.38709927,
    orbitPeriodDays: 87.97,
    rotationPeriodHours: 1407.6, // 58.6 days
    axialTilt: 0.034,
    inclination: 7.0,
    atmosphereColor: null,
    atmosphereIntensity: 0,
    uiColor: 'border-gray-400/60 bg-gray-400/20 text-gray-200',
    uiGlow: 'shadow-[0_0_10px_rgba(156,163,175,0.3)]',
  },
  {
    id: 'venus',
    name: 'Venus',
    emoji: '♀️',
    radius: 0.95,
    segments: 96,
    texture: 'venus-surface-8k.jpg',
    semiMajorAxisAu: 0.72333566,
    orbitPeriodDays: 224.7,
    rotationPeriodHours: 5832.5, // 243 days, retrograde
    axialTilt: 177.4, // effectively upside down
    inclination: 3.39,
    atmosphereColor: [0.95, 0.75, 0.30],
    atmosphereIntensity: 2.0,
    retrograde: true,
    uiColor: 'border-yellow-500/60 bg-yellow-500/20 text-yellow-200',
    uiGlow: 'shadow-[0_0_10px_rgba(234,179,8,0.3)]',
  },
  {
    id: 'mars',
    name: 'Mars',
    emoji: '♂️',
    radius: 0.53,
    segments: 96,
    texture: 'mars-8k.jpg',
    semiMajorAxisAu: 1.52371034,
    orbitPeriodDays: 687.0,
    rotationPeriodHours: 24.6,
    axialTilt: 25.19,
    inclination: 1.85,
    atmosphereColor: [0.85, 0.45, 0.20],
    atmosphereIntensity: 0.8,
    uiColor: 'border-red-500/60 bg-red-500/20 text-red-200',
    uiGlow: 'shadow-[0_0_10px_rgba(239,68,68,0.3)]',
    moons: [
      {
        id: 'phobos',
        name: 'Phobos',
        emoji: '🌑',
        radius: 0.04,
        segments: 32,
        texture: 'phobos-4k.jpg',
        surfaceTint: [0.82, 0.72, 0.62],
        shapeScale: [1.23, 1.0, 0.82],
        semiMajorAxisKm: 9375,
        orbitPeriodDays: 0.3187,
        rotationPeriodHours: 7.66,
        axialTilt: 0,
        inclination: 1.1,
        atmosphereColor: null,
        atmosphereIntensity: 0,
        uiColor: 'border-red-400/40 bg-red-400/10 text-red-300',
        uiGlow: '',
        parent: 'mars',
      },
      {
        id: 'deimos',
        name: 'Deimos',
        emoji: '🌑',
        radius: 0.025,
        segments: 32,
        texture: 'deimos-4k.jpg',
        surfaceTint: [0.86, 0.78, 0.68],
        shapeScale: [1.22, 1.0, 0.90],
        semiMajorAxisKm: 23457,
        orbitPeriodDays: 1.2625,
        rotationPeriodHours: 30.3,
        axialTilt: 0,
        inclination: 1.8,
        atmosphereColor: null,
        atmosphereIntensity: 0,
        uiColor: 'border-red-400/40 bg-red-400/10 text-red-300',
        uiGlow: '',
        parent: 'mars',
      },
    ],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    emoji: '🪐',
    radius: 1.8,
    segments: 128,
    texture: 'jupiter-8k.jpg',
    semiMajorAxisAu: 5.202887,
    orbitPeriodDays: 4333,
    rotationPeriodHours: 9.93,
    axialTilt: 3.13,
    inclination: 1.31,
    atmosphereColor: [0.72, 0.58, 0.40],
    atmosphereIntensity: 1.2,
    uiColor: 'border-amber-600/60 bg-amber-600/20 text-amber-200',
    uiGlow: 'shadow-[0_0_10px_rgba(217,119,6,0.3)]',
    knownMoonCount: 101,
    ring: {
      innerRadius: 1.72,
      outerRadius: 1.92,
      color: 0x8b735f,
      opacity: 0.11,
    },
    moons: [
      {
        id: 'io',
        name: 'Io',
        emoji: '🟡',
        radius: 0.12,
        segments: 48,
        texture: 'io-4k.jpg',
        semiMajorAxisKm: 421800,
        orbitPeriodDays: 1.762732,
        rotationPeriodHours: 42.5,
        axialTilt: 0,
        inclination: 0,
        atmosphereColor: null,
        atmosphereIntensity: 0,
        uiColor: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300',
        uiGlow: '',
        parent: 'jupiter',
      },
      {
        id: 'europa',
        name: 'Europa',
        emoji: '🧊',
        radius: 0.10,
        segments: 48,
        texture: 'europa-4k.jpg',
        surfaceTint: [1.08, 1.02, 0.90],
        semiMajorAxisKm: 671100,
        orbitPeriodDays: 3.525463,
        rotationPeriodHours: 85.2,
        axialTilt: 0.1,
        inclination: 0.5,
        atmosphereColor: null,
        atmosphereIntensity: 0,
        uiColor: 'border-blue-300/40 bg-blue-300/10 text-blue-200',
        uiGlow: '',
        parent: 'jupiter',
      },
      {
        id: 'ganymede',
        name: 'Ganymede',
        emoji: '🌑',
        radius: 0.14,
        segments: 48,
        texture: 'ganymede-4k.jpg',
        surfaceTint: [0.95, 0.91, 0.84],
        semiMajorAxisKm: 1070400,
        orbitPeriodDays: 7.155588,
        rotationPeriodHours: 171.7,
        axialTilt: 0.2,
        inclination: 0.18,
        atmosphereColor: null,
        atmosphereIntensity: 0,
        uiColor: 'border-slate-400/40 bg-slate-400/10 text-slate-300',
        uiGlow: '',
        parent: 'jupiter',
      },
      {
        id: 'callisto',
        name: 'Callisto',
        emoji: '🌑',
        radius: 0.13,
        segments: 48,
        texture: 'callisto-4k.jpg',
        surfaceTint: [0.88, 0.80, 0.70],
        semiMajorAxisKm: 1882700,
        orbitPeriodDays: 16.69044,
        rotationPeriodHours: 400.5,
        axialTilt: 0,
        inclination: 0.3,
        atmosphereColor: null,
        atmosphereIntensity: 0,
        uiColor: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
        uiGlow: '',
        parent: 'jupiter',
      },
      majorMoon({
        id: 'amalthea',
        name: 'Amalthea',
        radius: 0.026,
        semiMajorAxisKm: 181365,
        orbitPeriodDays: 0.498179,
        inclination: 0.37,
        parent: 'jupiter',
        color: [0.92, 0.48, 0.36],
      }),
      majorMoon({
        id: 'himalia',
        name: 'Himalia',
        radius: 0.021,
        semiMajorAxisKm: 11460000,
        orbitPeriodDays: 250.56,
        inclination: 27.5,
        parent: 'jupiter',
        color: [0.58, 0.54, 0.49],
      }),
    ],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    emoji: '🪐',
    radius: 1.5,
    segments: 128,
    texture: 'saturn-8k.jpg',
    semiMajorAxisAu: 9.53667594,
    orbitPeriodDays: 10759,
    rotationPeriodHours: 10.7,
    axialTilt: 26.73,
    inclination: 2.49,
    atmosphereColor: [0.85, 0.78, 0.50],
    atmosphereIntensity: 1.0,
    knownMoonCount: 274,
    ring: {
      innerRadius: 1.35,
      outerRadius: 2.45,
      color: 0xd8c69b,
      opacity: 0.92,
      texture: 'saturn-ring-alpha.png',
    },
    uiColor: 'border-yellow-600/60 bg-yellow-600/20 text-yellow-200',
    uiGlow: 'shadow-[0_0_10px_rgba(202,138,4,0.3)]',
    moons: [
      {
        id: 'titan',
        name: 'Titan',
        emoji: '🟡',
        radius: 0.16,
        segments: 48,
        texture: 'titan-4k.jpg',
        surfaceTint: [1.18, 0.78, 0.38],
        semiMajorAxisKm: 1221900,
        orbitPeriodDays: 15.945448,
        rotationPeriodHours: 382.7,
        axialTilt: 0,
        inclination: 0.35,
        atmosphereColor: [0.80, 0.55, 0.20],
        atmosphereIntensity: 1.5,
        uiColor: 'border-orange-400/40 bg-orange-400/10 text-orange-300',
        uiGlow: '',
        parent: 'saturn',
      },
      {
        id: 'enceladus',
        name: 'Enceladus',
        emoji: '🧊',
        radius: 0.04,
        segments: 32,
        texture: 'enceladus-4k.jpg',
        surfaceTint: [0.90, 0.97, 1.08],
        semiMajorAxisKm: 238400,
        orbitPeriodDays: 1.370218,
        rotationPeriodHours: 32.9,
        axialTilt: 0,
        inclination: 0,
        atmosphereColor: null,
        atmosphereIntensity: 0,
        uiColor: 'border-cyan-300/40 bg-cyan-300/10 text-cyan-200',
        uiGlow: '',
        parent: 'saturn',
      },
      majorMoon({
        id: 'mimas',
        name: 'Mimas',
        radius: 0.032,
        semiMajorAxisKm: 185539,
        orbitPeriodDays: 0.942422,
        inclination: 1.57,
        parent: 'saturn',
        color: [0.82, 0.84, 0.86],
      }),
      majorMoon({
        id: 'tethys',
        name: 'Tethys',
        radius: 0.052,
        semiMajorAxisKm: 294619,
        orbitPeriodDays: 1.887802,
        inclination: 1.12,
        parent: 'saturn',
        color: [0.90, 0.91, 0.92],
      }),
      majorMoon({
        id: 'dione',
        name: 'Dione',
        radius: 0.056,
        semiMajorAxisKm: 377396,
        orbitPeriodDays: 2.736915,
        inclination: 0.02,
        parent: 'saturn',
        color: [0.78, 0.82, 0.86],
      }),
      majorMoon({
        id: 'rhea',
        name: 'Rhea',
        radius: 0.07,
        semiMajorAxisKm: 527108,
        orbitPeriodDays: 4.518212,
        inclination: 0.35,
        parent: 'saturn',
        color: [0.74, 0.76, 0.78],
      }),
      majorMoon({
        id: 'iapetus',
        name: 'Iapetus',
        radius: 0.068,
        semiMajorAxisKm: 3560820,
        orbitPeriodDays: 79.3215,
        inclination: 15.47,
        parent: 'saturn',
        color: [0.58, 0.53, 0.48],
      }),
      majorMoon({
        id: 'pan',
        name: 'Pan',
        radius: 0.004,
        semiMajorAxisKm: 133584,
        orbitPeriodDays: 0.57505,
        inclination: 0.001,
        parent: 'saturn',
        color: [0.74, 0.70, 0.62],
      }),
      majorMoon({
        id: 'hyperion',
        name: 'Hyperion',
        radius: 0.02,
        semiMajorAxisKm: 1481009,
        orbitPeriodDays: 21.2766,
        inclination: 0.43,
        parent: 'saturn',
        color: [0.55, 0.49, 0.40],
      }),
    ],
  },
  {
    id: 'uranus',
    name: 'Uranus',
    emoji: '🔵',
    radius: 0.65,
    segments: 64,
    texture: 'uranus-2k.jpg',
    semiMajorAxisAu: 19.18916464,
    orbitPeriodDays: 30687,
    rotationPeriodHours: 17.24,
    axialTilt: 97.77, // extreme tilt!
    inclination: 0.77,
    atmosphereColor: [0.55, 0.85, 0.90],
    atmosphereIntensity: 1.3,
    retrograde: true,
    knownMoonCount: 28,
    ring: {
      innerRadius: 1.55,
      outerRadius: 2.02,
      color: 0x91bbc2,
      opacity: 0.18,
    },
    uiColor: 'border-teal-400/60 bg-teal-400/20 text-teal-200',
    uiGlow: 'shadow-[0_0_10px_rgba(45,212,191,0.3)]',
    moons: [
      majorMoon({
        id: 'miranda',
        name: 'Miranda',
        radius: 0.037,
        semiMajorAxisKm: 129390,
        orbitPeriodDays: 1.413479,
        inclination: 4.34,
        parent: 'uranus',
        color: [0.75, 0.80, 0.84],
      }),
      majorMoon({
        id: 'ariel',
        name: 'Ariel',
        radius: 0.052,
        semiMajorAxisKm: 190900,
        orbitPeriodDays: 2.520379,
        inclination: 0.26,
        parent: 'uranus',
        color: [0.84, 0.88, 0.90],
      }),
      majorMoon({
        id: 'umbriel',
        name: 'Umbriel',
        radius: 0.051,
        semiMajorAxisKm: 266000,
        orbitPeriodDays: 4.144177,
        inclination: 0.13,
        parent: 'uranus',
        color: [0.48, 0.52, 0.56],
      }),
      {
        id: 'titania',
        name: 'Titania',
        emoji: '🌑',
        radius: 0.06,
        segments: 32,
        texture: 'titania-4k.jpg',
        surfaceTint: [0.80, 0.90, 0.96],
        semiMajorAxisKm: 436298,
        orbitPeriodDays: 8.705869,
        rotationPeriodHours: 208.9,
        axialTilt: 0,
        inclination: 0.1,
        atmosphereColor: null,
        atmosphereIntensity: 0,
        uiColor: 'border-teal-300/40 bg-teal-300/10 text-teal-200',
        uiGlow: '',
        parent: 'uranus',
      },
      {
        id: 'oberon',
        name: 'Oberon',
        emoji: '🌑',
        radius: 0.055,
        segments: 32,
        texture: 'oberon-4k.jpg',
        surfaceTint: [0.78, 0.83, 0.88],
        semiMajorAxisKm: 583511,
        orbitPeriodDays: 13.463237,
        rotationPeriodHours: 323.1,
        axialTilt: 0,
        inclination: 0.1,
        atmosphereColor: null,
        atmosphereIntensity: 0,
        uiColor: 'border-teal-300/40 bg-teal-300/10 text-teal-200',
        uiGlow: '',
        parent: 'uranus',
      },
    ],
  },
  {
    id: 'neptune',
    name: 'Neptune',
    emoji: '🔵',
    radius: 0.62,
    segments: 64,
    texture: 'neptune-2k.jpg',
    semiMajorAxisAu: 30.06992276,
    orbitPeriodDays: 60190,
    rotationPeriodHours: 16.11,
    axialTilt: 28.32,
    inclination: 1.77,
    atmosphereColor: [0.30, 0.45, 0.95],
    atmosphereIntensity: 1.5,
    knownMoonCount: 16,
    ring: {
      innerRadius: 1.58,
      outerRadius: 2.12,
      color: 0x7084a8,
      opacity: 0.14,
    },
    uiColor: 'border-blue-500/60 bg-blue-500/20 text-blue-200',
    uiGlow: 'shadow-[0_0_10px_rgba(59,130,246,0.3)]',
    moons: [
      majorMoon({
        id: 'larissa',
        name: 'Larissa',
        radius: 0.015,
        semiMajorAxisKm: 73548,
        orbitPeriodDays: 0.55465,
        inclination: 0.2,
        parent: 'neptune',
        color: [0.49, 0.50, 0.54],
      }),
      majorMoon({
        id: 'proteus',
        name: 'Proteus',
        radius: 0.035,
        semiMajorAxisKm: 117646,
        orbitPeriodDays: 1.122315,
        inclination: 0.08,
        parent: 'neptune',
        color: [0.46, 0.48, 0.52],
      }),
      majorMoon({
        id: 'nereid',
        name: 'Nereid',
        radius: 0.027,
        semiMajorAxisKm: 5513400,
        orbitPeriodDays: 360.136,
        inclination: 7.23,
        parent: 'neptune',
        color: [0.58, 0.60, 0.64],
      }),
      {
        id: 'triton',
        name: 'Triton',
        emoji: '🌑',
        radius: 0.08,
        segments: 32,
        texture: 'triton-4k.jpg',
        surfaceTint: [1.02, 0.84, 0.88],
        semiMajorAxisKm: 354800,
        orbitPeriodDays: 5.876994,
        rotationPeriodHours: 141.0,
        axialTilt: 0,
        inclination: 157.3, // retrograde orbit
        atmosphereColor: null,
        atmosphereIntensity: 0,
        retrograde: true,
        uiColor: 'border-blue-300/40 bg-blue-300/10 text-blue-200',
        uiGlow: '',
        parent: 'neptune',
      },
    ],
  },
  {
    id: 'pluto',
    name: 'Pluto',
    emoji: '⚪',
    radius: 0.18,
    segments: 32,
    texture: 'pluto-2k.jpg',
    semiMajorAxisAu: 39.482,
    orbitPeriodDays: 90560,
    rotationPeriodHours: 153.3,
    axialTilt: 122.53,
    inclination: 17.16,
    atmosphereColor: [0.65, 0.55, 0.45],
    atmosphereIntensity: 0.4,
    knownMoonCount: 5,
    uiColor: 'border-stone-400/60 bg-stone-400/20 text-stone-200',
    uiGlow: 'shadow-[0_0_10px_rgba(168,162,158,0.3)]',
    moons: [
      majorMoon({
        id: 'charon',
        name: 'Charon',
        radius: 0.092,
        semiMajorAxisKm: 19596,
        orbitPeriodDays: 6.38723,
        inclination: 0,
        parent: 'pluto',
        color: [0.72, 0.70, 0.69],
      }),
      majorMoon({
        id: 'styx',
        name: 'Styx',
        radius: 0.003,
        semiMajorAxisKm: 42656,
        orbitPeriodDays: 20.16155,
        inclination: 0.8,
        parent: 'pluto',
        color: [0.68, 0.66, 0.64],
      }),
      majorMoon({
        id: 'nix',
        name: 'Nix',
        radius: 0.006,
        semiMajorAxisKm: 48694,
        orbitPeriodDays: 24.85463,
        inclination: 0.1,
        parent: 'pluto',
        color: [0.76, 0.73, 0.70],
      }),
      majorMoon({
        id: 'kerberos',
        name: 'Kerberos',
        radius: 0.004,
        semiMajorAxisKm: 57783,
        orbitPeriodDays: 32.16756,
        inclination: 0.4,
        parent: 'pluto',
        color: [0.58, 0.56, 0.54],
      }),
      majorMoon({
        id: 'hydra',
        name: 'Hydra',
        radius: 0.006,
        semiMajorAxisKm: 64738,
        orbitPeriodDays: 38.20177,
        inclination: 0.2,
        parent: 'pluto',
        color: [0.74, 0.72, 0.70],
      }),
    ],
  },
  {
    id: 'ceres',
    name: 'Ceres',
    emoji: '⚪',
    radius: 0.074,
    segments: 48,
    texture: 'ceres-dawn-2k.webp',
    semiMajorAxisAu: 2.7675,
    orbitPeriodDays: 1681.63,
    rotationPeriodHours: 9.074,
    axialTilt: 4,
    inclination: 10.59,
    atmosphereColor: null,
    atmosphereIntensity: 0,
    knownMoonCount: 0,
    surfaceTint: [0.62, 0.61, 0.59],
    uiColor: 'border-stone-400/50 bg-stone-400/10 text-stone-200',
    uiGlow: '',
  },
  {
    id: 'haumea',
    name: 'Haumea',
    emoji: '⚪',
    radius: 0.125,
    segments: 48,
    shapeScale: [1.45, 0.82, 0.72],
    semiMajorAxisAu: 43.13,
    orbitPeriodDays: 103774,
    rotationPeriodHours: 3.915,
    axialTilt: 126,
    inclination: 28.19,
    atmosphereColor: null,
    atmosphereIntensity: 0,
    knownMoonCount: 2,
    surfaceTint: [0.78, 0.79, 0.80],
    uiColor: 'border-slate-300/50 bg-slate-300/10 text-slate-100',
    uiGlow: '',
  },
  {
    id: 'makemake',
    name: 'Makemake',
    emoji: '⚪',
    radius: 0.112,
    segments: 48,
    semiMajorAxisAu: 45.79,
    orbitPeriodDays: 111845,
    rotationPeriodHours: 22.83,
    axialTilt: 0,
    inclination: 29,
    atmosphereColor: null,
    atmosphereIntensity: 0,
    knownMoonCount: 1,
    surfaceTint: [0.72, 0.52, 0.42],
    uiColor: 'border-orange-300/50 bg-orange-300/10 text-orange-100',
    uiGlow: '',
  },
  {
    id: 'eris',
    name: 'Eris',
    emoji: '⚪',
    radius: 0.182,
    segments: 48,
    semiMajorAxisAu: 67.78,
    orbitPeriodDays: 203830,
    rotationPeriodHours: 25.9,
    axialTilt: 78,
    inclination: 44.04,
    atmosphereColor: null,
    atmosphereIntensity: 0,
    knownMoonCount: 1,
    surfaceTint: [0.82, 0.82, 0.80],
    uiColor: 'border-zinc-300/50 bg-zinc-300/10 text-zinc-100',
    uiGlow: '',
  },
]

/** Get a flat list of all body IDs including moons */
export function getAllBodyIds(): CelestialBodyId[] {
  const ids: CelestialBodyId[] = ['sun', 'earth', 'moon']
  for (const p of PLANETS) {
    ids.push(p.id)
    for (const m of p.moons ?? []) {
      ids.push(m.id)
    }
  }
  return ids
}

/** Find a planet def by ID (searches planets and their moons) */
export function findPlanetDef(id: CelestialBodyId): PlanetDef | undefined {
  for (const p of PLANETS) {
    if (p.id === id) return p
    for (const m of p.moons ?? []) {
      if (m.id === id) return m
    }
  }
  return undefined
}
