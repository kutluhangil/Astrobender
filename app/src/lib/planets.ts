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
  | 'saturn'
  | 'titan'
  | 'enceladus'
  | 'uranus'
  | 'titania'
  | 'oberon'
  | 'neptune'
  | 'triton'
  | 'pluto'

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
  texture: string
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
  /** Whether this body has rings (Saturn) */
  hasRing?: boolean
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

export const PLANETS: PlanetDef[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    emoji: '🪨',
    radius: 0.38,
    segments: 64,
    texture: 'mercury-8k.jpg',
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
    hasRing: true,
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
    uiColor: 'border-teal-400/60 bg-teal-400/20 text-teal-200',
    uiGlow: 'shadow-[0_0_10px_rgba(45,212,191,0.3)]',
    moons: [
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
    uiColor: 'border-blue-500/60 bg-blue-500/20 text-blue-200',
    uiGlow: 'shadow-[0_0_10px_rgba(59,130,246,0.3)]',
    moons: [
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
    uiColor: 'border-stone-400/60 bg-stone-400/20 text-stone-200',
    uiGlow: 'shadow-[0_0_10px_rgba(168,162,158,0.3)]',
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
