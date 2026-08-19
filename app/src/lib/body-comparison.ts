import { CELESTIAL_FACTS } from './celestial-facts.ts'
import { findPlanetDef, type CelestialBodyId } from './planets.ts'
import { pickLanguage, type UiLanguage } from './ui-language.ts'

/** IAU mean radius of Earth, the reference every ratio below is stated against. */
export const EARTH_RADIUS_KM = 6371

/** Mean Earth-Moon distance, used to state the Moon's own orbit legibly. */
export const MOON_SEMI_MAJOR_AXIS_KM = 384_400

/**
 * The catalog states radii as display strings ("1,163 km", "Yaklaşık 780 km
 * (ortalama)"). Rather than duplicate them as a second numeric table that can
 * drift, the leading measurement is parsed back out and an unreadable entry
 * raises instead of silently comparing against a wrong number.
 */
export function bodyRadiusKm(bodyId: CelestialBodyId): number {
  const raw = CELESTIAL_FACTS[bodyId]?.radiusKm
  if (!raw) throw new Error(`No catalogued radius for body: ${bodyId}`)
  const match = raw.match(/([\d.,]+)\s*km/)
  if (!match) throw new Error(`Catalogued radius for ${bodyId} has no km value: ${raw}`)
  const value = Number(match[1].replace(/,/g, ''))
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Catalogued radius for ${bodyId} is not a positive number: ${raw}`)
  }
  return value
}

export function earthRadiusRatio(bodyId: CelestialBodyId): number {
  return bodyRadiusKm(bodyId) / EARTH_RADIUS_KM
}

function formatRatio(ratio: number, language: UiLanguage): string {
  const digits = ratio >= 10 ? 0 : ratio >= 1 ? 2 : ratio >= 0.01 ? 2 : 4
  const formatted = new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(ratio)
  return pickLanguage(language, `Dünya'nın ${formatted} katı`, `${formatted}× Earth`)
}

function formatNumber(value: number, language: UiLanguage, digits: number): string {
  return new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value)
}

export interface SignatureMetric {
  key: 'radius' | 'distance' | 'moons'
  label: string
  value: string
  /** Second line that puts the value on a human scale; null when none applies. */
  comparison: string | null
}

function radiusMetric(bodyId: CelestialBodyId, language: UiLanguage): SignatureMetric {
  const radiusKm = bodyRadiusKm(bodyId)
  return {
    key: 'radius',
    label: pickLanguage(language, 'Yarıçap', 'Radius'),
    value: `${formatNumber(radiusKm, language, 1)} km`,
    comparison: bodyId === 'earth' ? null : formatRatio(radiusKm / EARTH_RADIUS_KM, language),
  }
}

function distanceMetric(bodyId: CelestialBodyId, language: UiLanguage): SignatureMetric {
  const label = pickLanguage(language, 'Yörünge', 'Orbit')
  if (bodyId === 'sun') {
    return {
      key: 'distance',
      label,
      value: pickLanguage(language, 'Sistem merkezi', 'System centre'),
      comparison: null,
    }
  }
  if (bodyId === 'earth') {
    return { key: 'distance', label, value: '1.00 AU', comparison: null }
  }
  if (bodyId === 'moon') {
    return {
      key: 'distance',
      label,
      value: `${formatNumber(MOON_SEMI_MAJOR_AXIS_KM, language, 0)} km`,
      comparison: pickLanguage(language, "Dünya'nın çevresinde", 'around Earth'),
    }
  }

  const definition = findPlanetDef(bodyId)
  if (!definition) throw new Error(`No orbital definition for body: ${bodyId}`)
  if (definition.parent) {
    if (definition.semiMajorAxisKm === undefined) {
      throw new Error(`Moon ${bodyId} has no parent-centric semi-major axis`)
    }
    const parentName = CELESTIAL_FACTS[definition.parent]
    return {
      key: 'distance',
      label,
      value: `${formatNumber(definition.semiMajorAxisKm, language, 0)} km`,
      comparison: pickLanguage(
        language,
        `${parentName.nameTr} çevresinde`,
        `around ${parentName.name}`,
      ),
    }
  }

  if (definition.semiMajorAxisAu === undefined) {
    throw new Error(`Body ${bodyId} has no heliocentric semi-major axis`)
  }
  return {
    key: 'distance',
    label,
    value: `${formatNumber(definition.semiMajorAxisAu, language, 2)} AU`,
    comparison: pickLanguage(
      language,
      `Dünya-Güneş uzaklığının ${formatNumber(definition.semiMajorAxisAu, language, 1)} katı`,
      `${formatNumber(definition.semiMajorAxisAu, language, 1)}× the Earth-Sun distance`,
    ),
  }
}

function moonMetric(bodyId: CelestialBodyId, language: UiLanguage): SignatureMetric {
  const definition = findPlanetDef(bodyId)
  const modelled = definition?.moons?.length ?? 0
  const known = definition?.knownMoonCount
  const label = pickLanguage(language, 'Uydu', 'Moons')

  if (bodyId === 'earth') {
    return {
      key: 'moons',
      label,
      value: '1',
      comparison: pickLanguage(language, '1 tanesi modelli', '1 modelled'),
    }
  }
  if (known === undefined) {
    return {
      key: 'moons',
      label,
      value: modelled > 0 ? String(modelled) : '—',
      comparison: modelled > 0
        ? pickLanguage(language, `${modelled} tanesi modelli`, `${modelled} modelled`)
        : pickLanguage(language, 'Bilinen uydu yok', 'No known moons'),
    }
  }
  return {
    key: 'moons',
    label,
    value: String(known),
    comparison: modelled > 0
      ? pickLanguage(language, `${modelled} tanesi modelli`, `${modelled} modelled`)
      : pickLanguage(language, 'Hiçbiri modellenmedi', 'None modelled'),
  }
}

/**
 * The three values that lead the body panel. Everything else is disclosed on
 * demand, so this list stays at exactly three.
 */
export function getSignatureMetrics(
  bodyId: CelestialBodyId,
  language: UiLanguage,
): [SignatureMetric, SignatureMetric, SignatureMetric] {
  return [
    radiusMetric(bodyId, language),
    distanceMetric(bodyId, language),
    moonMetric(bodyId, language),
  ]
}
