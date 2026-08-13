import { CELESTIAL_FACTS, type CelestialFact } from './celestial-facts.ts'
import {
  findPlanetDef,
  getAllBodyIds,
  type CelestialBodyId,
  type PlanetDef,
} from './planets.ts'
import type { EvidenceRecord } from './scientific-evidence.ts'

export interface CelestialCatalogEntry {
  id: CelestialBodyId
  fact: CelestialFact
  definition?: PlanetDef
  evidence: EvidenceRecord
  /** Convenience mirrors for non-evidence-aware consumers. */
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
const CATALOG_SOURCE_REVIEWED_AT = '2026-07-26'

const SOURCE_BY_SYSTEM: Partial<Record<CelestialBodyId, string>> = {
  io: NASA_JUPITER_MOONS_URL,
  europa: NASA_JUPITER_MOONS_URL,
  ganymede: NASA_JUPITER_MOONS_URL,
  callisto: NASA_JUPITER_MOONS_URL,
  amalthea: NASA_JUPITER_MOONS_URL,
  himalia: NASA_JUPITER_MOONS_URL,
  pan: NASA_SATURN_MOONS_URL,
  mimas: NASA_SATURN_MOONS_URL,
  tethys: NASA_SATURN_MOONS_URL,
  dione: NASA_SATURN_MOONS_URL,
  rhea: NASA_SATURN_MOONS_URL,
  titan: NASA_SATURN_MOONS_URL,
  iapetus: NASA_SATURN_MOONS_URL,
  hyperion: NASA_SATURN_MOONS_URL,
  enceladus: NASA_SATURN_MOONS_URL,
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
}

function factEvidence(id: CelestialBodyId): EvidenceRecord {
  return {
    evidenceClass: 'sourced-static',
    publisher: 'NASA',
    sourceUrl: SOURCE_BY_SYSTEM[id] ?? NASA_SOLAR_SYSTEM_URL,
    verifiedAt: CATALOG_SOURCE_REVIEWED_AT,
    uncertainty: 'Unknown where the cited source does not publish an uncertainty.',
    limitation: 'Values are rounded and localized for the instrument HUD.',
  }
}

export const CELESTIAL_CATALOG = Object.fromEntries(
  getAllBodyIds().map((id) => {
    const fact = CELESTIAL_FACTS[id]
    if (!fact) throw new Error(`Missing celestial fact for catalog body: ${id}`)
    const evidence = factEvidence(id)
    const entry: CelestialCatalogEntry = {
      id,
      fact,
      definition: findPlanetDef(id),
      evidence,
      sourceUrl: evidence.sourceUrl,
      verifiedAt: evidence.verifiedAt,
    }
    return [id, entry]
  }),
) as Record<CelestialBodyId, CelestialCatalogEntry>

export function getCelestialEntry(id: CelestialBodyId): CelestialCatalogEntry {
  const entry = CELESTIAL_CATALOG[id]
  if (!entry) throw new Error(`Unknown celestial catalog body: ${id}`)
  return entry
}
