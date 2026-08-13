import { getAllBodyIds, type CelestialBodyId } from './planets.ts'
import type { EvidenceRecord } from './scientific-evidence.ts'

export interface LocalizedScienceText {
  tr: string
  en: string
}

export type PhysicalMeasurementField = 'mass' | 'density' | 'gravity'

export interface CelestialPhysicalEvidence {
  /** Field-level provenance prevents a table row from implying support for other measurements. */
  mass: EvidenceRecord | null
  density: EvidenceRecord | null
  gravity: EvidenceRecord | null
  /** No thermal source is recorded at this field's required per-body granularity. */
  temperature: null
  /** No chemistry or surface-composition source is recorded at this field's required per-body granularity. */
  chemistry: null
  limitation: LocalizedScienceText
}

export interface CelestialPhysicalProfile {
  /** Mass from a directly cited JPL table row; null means this card has no direct mass source. */
  mass: string | null
  /** Bulk or mean density from a directly cited JPL table row. */
  density: string | null
  /** Equatorial gravity from a directly cited JPL planetary-table row. */
  gravity: string | null
  /** Intentionally unavailable until a body-specific primary thermal source is recorded. */
  temperature: string | null
  /** Intentionally unavailable until a body-specific primary composition source is recorded. */
  chemistry: LocalizedScienceText | null
  evidence: CelestialPhysicalEvidence
}

export const JPL_PHYSICAL_PARAMETERS_URL = 'https://ssd.jpl.nasa.gov/planets/phys_par.html'
export const JPL_SATELLITE_PARAMETERS_URL = 'https://ssd.jpl.nasa.gov/sats/phys_par/'
const PHYSICAL_PROFILE_REVIEWED_AT = '2026-08-13'

interface JplPlanetaryMeasurements {
  mass: string
  density: string
  gravity: string
}

/**
 * Exact display values from JPL's Planetary Physical Parameters table.
 * The source table excludes the Sun, so it is deliberately absent here.
 */
const JPL_PLANETARY_MEASUREMENTS: Partial<Record<CelestialBodyId, JplPlanetaryMeasurements>> = {
  mercury: { mass: '3.30103 × 10²³ kg', density: '5.4289 g/cm³', gravity: '3.70 m/s²' },
  venus: { mass: '4.86731 × 10²⁴ kg', density: '5.243 g/cm³', gravity: '8.87 m/s²' },
  earth: { mass: '5.97217 × 10²⁴ kg', density: '5.5134 g/cm³', gravity: '9.80 m/s²' },
  mars: { mass: '6.41691 × 10²³ kg', density: '3.9340 g/cm³', gravity: '3.71 m/s²' },
  jupiter: { mass: '1.898125 × 10²⁷ kg', density: '1.3262 g/cm³', gravity: '24.79 m/s²' },
  saturn: { mass: '5.68317 × 10²⁶ kg', density: '0.6871 g/cm³', gravity: '10.44 m/s²' },
  uranus: { mass: '8.68099 × 10²⁵ kg', density: '1.270 g/cm³', gravity: '8.87 m/s²' },
  neptune: { mass: '1.024092 × 10²⁶ kg', density: '1.638 g/cm³', gravity: '11.15 m/s²' },
  ceres: { mass: '9.38416 × 10²⁰ kg', density: '2.162 g/cm³', gravity: '0.27 m/s²' },
  pluto: { mass: '1.30246 × 10²² kg', density: '1.853 g/cm³', gravity: '0.62 m/s²' },
  eris: { mass: '1.6600 × 10²² kg', density: '2.3 g/cm³', gravity: '0.77 m/s²' },
  makemake: { mass: '3.100 × 10²¹ kg', density: '2.1 g/cm³', gravity: '0.40 m/s²' },
  haumea: { mass: '4.006 × 10²¹ kg', density: '2.6 g/cm³', gravity: '0.35 m/s²' },
}

/**
 * Exact mean-density values from JPL's Planetary Satellite Physical Parameters
 * table. That table publishes GM, mean radius, and mean density; it does not
 * publish mass or surface gravity, so this map intentionally contains density only.
 */
const JPL_SATELLITE_DENSITIES: Partial<Record<CelestialBodyId, string>> = {
  moon: '3.344 g/cm³',
  phobos: '1.872 g/cm³',
  deimos: '1.471 g/cm³',
  io: '3.5276 g/cm³',
  europa: '3.0130 g/cm³',
  ganymede: '1.9416 g/cm³',
  callisto: '1.8340 g/cm³',
  amalthea: '1.0111 g/cm³',
  himalia: '0.8827 g/cm³',
  pan: '0.3650 g/cm³',
  titan: '1.8814 g/cm³',
  enceladus: '1.6097 g/cm³',
  mimas: '1.1501 g/cm³',
  tethys: '0.9840 g/cm³',
  dione: '1.4781 g/cm³',
  rhea: '1.2372 g/cm³',
  iapetus: '1.0887 g/cm³',
  hyperion: '0.5386 g/cm³',
  miranda: '1.178 g/cm³',
  ariel: '1.539 g/cm³',
  umbriel: '1.523 g/cm³',
  titania: '1.653 g/cm³',
  oberon: '1.664 g/cm³',
  larissa: '1.0303 g/cm³',
  proteus: '1.0269 g/cm³',
  triton: '2.0649 g/cm³',
  charon: '1.853 g/cm³',
  nix: '0.88 g/cm³',
  hydra: '1.21 g/cm³',
}

function physicalMeasurementEvidence(
  sourceUrl: string,
  field: PhysicalMeasurementField,
): EvidenceRecord {
  const tableName = sourceUrl === JPL_PHYSICAL_PARAMETERS_URL
    ? 'Planetary Physical Parameters'
    : 'Planetary Satellite Physical Parameters'
  const fieldName = field === 'gravity' ? 'equatorial surface gravity' : field

  return {
    evidenceClass: 'sourced-static',
    publisher: 'NASA Jet Propulsion Laboratory',
    sourceUrl,
    verifiedAt: PHYSICAL_PROFILE_REVIEWED_AT,
    uncertainty: 'The JPL table publishes the value and its stated uncertainty where available.',
    limitation: `${tableName} directly supports this ${fieldName} field only; it does not establish the other HUD fields.`,
  }
}

function profileFor(bodyId: CelestialBodyId): CelestialPhysicalProfile {
  const planetary = JPL_PLANETARY_MEASUREMENTS[bodyId]
  const satelliteDensity = JPL_SATELLITE_DENSITIES[bodyId]
  const mass = planetary?.mass ?? null
  const density = planetary?.density ?? satelliteDensity ?? null
  const gravity = planetary?.gravity ?? null

  return {
    mass,
    density,
    gravity,
    temperature: null,
    chemistry: null,
    evidence: {
      mass: mass ? physicalMeasurementEvidence(JPL_PHYSICAL_PARAMETERS_URL, 'mass') : null,
      density: density
        ? physicalMeasurementEvidence(
          planetary ? JPL_PHYSICAL_PARAMETERS_URL : JPL_SATELLITE_PARAMETERS_URL,
          'density',
        )
        : null,
      gravity: gravity ? physicalMeasurementEvidence(JPL_PHYSICAL_PARAMETERS_URL, 'gravity') : null,
      temperature: null,
      chemistry: null,
      limitation: {
        tr: 'Her ölçüm yalnız kaynak rozetinin bağlı olduğu JPL tablosundaki gövde satırı ve sütunla sınırlıdır. Uydu tablosu GM, ortalama yarıçap ve ortalama yoğunluk yayımlar; bu kartta bunlardan kütle veya yüzey yerçekimi türetilmez. Sıcaklık ile kimya/yüzey bileşimi, gövdeye özgü birincil kaynak kaydedilene kadar kullanılabilir değildir.',
        en: 'Each measurement is limited to the body row and column in the JPL table linked by its source badge. The satellite table publishes GM, mean radius, and mean density; this card does not derive mass or surface gravity from them. Temperature and chemistry/surface composition are unavailable until a body-specific primary source is recorded.',
      },
    },
  }
}

export const CELESTIAL_PHYSICAL_PROFILES = Object.fromEntries(
  getAllBodyIds().map((bodyId) => [bodyId, profileFor(bodyId)]),
) as Record<CelestialBodyId, CelestialPhysicalProfile>

export function physicalProfileValue(value: string | null, language: 'tr' | 'en'): string {
  if (value) return value
  return language === 'tr' ? 'Güvenilir ölçüm yok' : 'No reliable measurement'
}
