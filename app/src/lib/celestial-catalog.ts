import { CELESTIAL_FACTS, type CelestialFact } from './celestial-facts.ts'
import {
  findPlanetDef,
  getAllBodyIds,
  type CelestialBodyId,
  type PlanetDef,
} from './planets.ts'
import { CATALOG_VERIFIED_AT } from './source-governance.ts'

export interface CelestialCatalogEntry {
  id: CelestialBodyId
  fact: CelestialFact
  definition?: PlanetDef
  sourceUrl: string
  verifiedAt: string
}

const NASA_SOLAR_SYSTEM_URL = 'https://science.nasa.gov/solar-system/'
const NASA_JUPITER_MOONS_URL = 'https://science.nasa.gov/jupiter/moons/'
const NASA_SATURN_MOONS_URL = 'https://science.nasa.gov/saturn/moons/'
const NASA_URANUS_MOONS_URL = 'https://science.nasa.gov/uranus/moons/'
const NASA_NEPTUNE_MOONS_URL = 'https://science.nasa.gov/neptune/moons/'
const NASA_PLUTO_URL = 'https://science.nasa.gov/dwarf-planets/pluto/'
const NASA_DWARF_PLANETS_URL = 'https://science.nasa.gov/dwarf-planets/'
const NASA_CERES_MAP_URL =
  'https://science.nasa.gov/resource/colorized-map-of-ceres-mercator-projection/'
const NASA_ASTEROIDS_URL = 'https://science.nasa.gov/solar-system/asteroids/'
const NASA_VESTA_URL = 'https://science.nasa.gov/solar-system/asteroids/4-vesta/'
const NASA_PSYCHE_URL = 'https://science.nasa.gov/solar-system/asteroids/16-psyche/'

const SOURCE_BY_SYSTEM: Partial<Record<CelestialBodyId, string>> = {
  io: NASA_JUPITER_MOONS_URL,
  europa: NASA_JUPITER_MOONS_URL,
  ganymede: NASA_JUPITER_MOONS_URL,
  callisto: NASA_JUPITER_MOONS_URL,
  amalthea: NASA_JUPITER_MOONS_URL,
  himalia: NASA_JUPITER_MOONS_URL,
  metis: NASA_JUPITER_MOONS_URL,
  thebe: NASA_JUPITER_MOONS_URL,
  elara: NASA_JUPITER_MOONS_URL,
  pasiphae: NASA_JUPITER_MOONS_URL,
  pan: NASA_SATURN_MOONS_URL,
  mimas: NASA_SATURN_MOONS_URL,
  tethys: NASA_SATURN_MOONS_URL,
  dione: NASA_SATURN_MOONS_URL,
  rhea: NASA_SATURN_MOONS_URL,
  titan: NASA_SATURN_MOONS_URL,
  iapetus: NASA_SATURN_MOONS_URL,
  hyperion: NASA_SATURN_MOONS_URL,
  enceladus: NASA_SATURN_MOONS_URL,
  janus: NASA_SATURN_MOONS_URL,
  epimetheus: NASA_SATURN_MOONS_URL,
  phoebe: NASA_SATURN_MOONS_URL,
  miranda: NASA_URANUS_MOONS_URL,
  ariel: NASA_URANUS_MOONS_URL,
  umbriel: NASA_URANUS_MOONS_URL,
  titania: NASA_URANUS_MOONS_URL,
  oberon: NASA_URANUS_MOONS_URL,
  larissa: NASA_NEPTUNE_MOONS_URL,
  proteus: NASA_NEPTUNE_MOONS_URL,
  nereid: NASA_NEPTUNE_MOONS_URL,
  triton: NASA_NEPTUNE_MOONS_URL,
  pluto: NASA_PLUTO_URL,
  charon: NASA_PLUTO_URL,
  styx: NASA_PLUTO_URL,
  nix: NASA_PLUTO_URL,
  kerberos: NASA_PLUTO_URL,
  hydra: NASA_PLUTO_URL,
  ceres: NASA_CERES_MAP_URL,
  haumea: NASA_DWARF_PLANETS_URL,
  makemake: NASA_DWARF_PLANETS_URL,
  eris: NASA_DWARF_PLANETS_URL,
  vesta: NASA_VESTA_URL,
  psyche: NASA_PSYCHE_URL,
  pallas: NASA_ASTEROIDS_URL,
  hygiea: NASA_ASTEROIDS_URL,
  juno: NASA_ASTEROIDS_URL,
  quaoar: NASA_DWARF_PLANETS_URL,
  gonggong: NASA_DWARF_PLANETS_URL,
  sedna: NASA_DWARF_PLANETS_URL,
}

export const CELESTIAL_CATALOG = Object.fromEntries(
  getAllBodyIds().map((id) => {
    const fact = CELESTIAL_FACTS[id]
    if (!fact) throw new Error(`Missing celestial fact for catalog body: ${id}`)
    const entry: CelestialCatalogEntry = {
      id,
      fact,
      definition: findPlanetDef(id),
      sourceUrl: SOURCE_BY_SYSTEM[id] ?? NASA_SOLAR_SYSTEM_URL,
      verifiedAt: CATALOG_VERIFIED_AT,
    }
    return [id, entry]
  }),
) as Record<CelestialBodyId, CelestialCatalogEntry>

export function getCelestialEntry(id: CelestialBodyId): CelestialCatalogEntry {
  const entry = CELESTIAL_CATALOG[id]
  if (!entry) throw new Error(`Unknown celestial catalog body: ${id}`)
  return entry
}
