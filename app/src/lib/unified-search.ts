import { CELESTIAL_CATALOG } from './celestial-catalog.ts'
import { IAU_CONSTELLATIONS, type ConstellationCatalogEntry } from './constellations.ts'
import type { EarthEvent } from './earth-observatory.ts'
import { LANDING_SITES, type LandingSite } from './landing-sites.ts'
import {
  NAMED_SMALL_BODIES,
  type CloseApproach,
  type NamedSmallBody,
} from './jpl-small-bodies.ts'
import { DEEP_SPACE_PROBES, type DeepSpaceProbe } from './probes.ts'
import type { SatInfo } from './satellites.ts'
import type { UiLanguage } from './ui-language.ts'
import type { CelestialBodyId } from './planets.ts'

export type UnifiedSearchResult =
  | { kind: 'satellite'; id: string; title: string; subtitle: string; satelliteIndex: number }
  | { kind: 'body'; id: string; title: string; subtitle: string; bodyId: CelestialBodyId }
  | { kind: 'surface-site'; id: string; title: string; subtitle: string; site: LandingSite }
  | { kind: 'earth-event'; id: string; title: string; subtitle: string; event: EarthEvent }
  | { kind: 'small-body'; id: string; title: string; subtitle: string; body: NamedSmallBody }
  | { kind: 'close-approach'; id: string; title: string; subtitle: string; approach: CloseApproach }
  | { kind: 'mission'; id: string; title: string; subtitle: string; probe: DeepSpaceProbe }
  | { kind: 'constellation'; id: string; title: string; subtitle: string; constellation: ConstellationCatalogEntry }

export interface UnifiedSearchSources {
  satellites: SatInfo[]
  earthEvents?: EarthEvent[]
  closeApproaches?: CloseApproach[]
}

interface RankedResult {
  result: UnifiedSearchResult
  searchable: string
  score: number
}

const KIND_LABELS: Record<UnifiedSearchResult['kind'], [string, string]> = {
  satellite: ['Uydu', 'Satellite'],
  body: ['Gök cismi', 'Celestial body'],
  'surface-site': ['Yüzey noktası', 'Surface site'],
  'earth-event': ['Dünya olayı', 'Earth event'],
  'small-body': ['Küçük cisim', 'Small body'],
  'close-approach': ['Yakın geçiş', 'Close approach'],
  mission: ['Görev', 'Mission'],
  constellation: ['Takımyıldız', 'Constellation'],
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ı/g, 'i')
    .toUpperCase()
}

function fuzzy(value: string, query: string): boolean {
  let queryIndex = 0
  for (const character of value) {
    if (character === query[queryIndex]) queryIndex += 1
    if (queryIndex === query.length) return true
  }
  return false
}

function matchScore(searchable: string, query: string): number {
  if (searchable === query) return 0
  if (searchable.startsWith(query)) return 1
  if (searchable.includes(query)) return 2
  return searchable.split(/\s+/).some((word) => fuzzy(word, query))
    ? 3
    : Number.POSITIVE_INFINITY
}

function withKindLabel(
  language: UiLanguage,
  kind: UnifiedSearchResult['kind'],
  detail: string,
): string {
  const label = KIND_LABELS[kind][language === 'tr' ? 0 : 1]
  return detail ? `${label} · ${detail}` : label
}

export function searchObservatory(
  query: string,
  sources: UnifiedSearchSources,
  language: UiLanguage,
  limit = 10,
): UnifiedSearchResult[] {
  const normalizedQuery = normalize(query.trim())
  if (normalizedQuery.length < 2) return []
  const ranked: RankedResult[] = []

  const add = (result: UnifiedSearchResult, aliases: string[]) => {
    const normalizedAliases = aliases.map(normalize).filter(Boolean)
    const searchable = normalizedAliases.join(' ')
    const score = Math.min(
      matchScore(searchable, normalizedQuery),
      ...normalizedAliases.map((alias) => matchScore(alias, normalizedQuery)),
    )
    if (Number.isFinite(score)) ranked.push({ result, searchable, score })
  }

  for (let index = 0; index < sources.satellites.length; index += 1) {
    const satellite = sources.satellites[index]
    add({
      kind: 'satellite',
      id: `satellite-${satellite.norad}`,
      title: satellite.name,
      subtitle: withKindLabel(language, 'satellite', `NORAD ${satellite.norad}`),
      satelliteIndex: index,
    }, [satellite.name, String(satellite.norad)])
  }

  for (const entry of Object.values(CELESTIAL_CATALOG)) {
    add({
      kind: 'body',
      id: `body-${entry.id}`,
      title: language === 'tr' ? entry.fact.nameTr : entry.fact.name,
      subtitle: withKindLabel(language, 'body', language === 'tr' ? entry.fact.typeTr : entry.fact.name),
      bodyId: entry.id,
    }, [entry.id, entry.fact.name, entry.fact.nameTr, entry.fact.typeTr])
  }

  for (const site of LANDING_SITES) {
    add({
      kind: 'surface-site',
      id: `site-${site.id}`,
      title: language === 'tr' ? site.nameTr : site.name,
      subtitle: withKindLabel(language, 'surface-site', `${site.emoji} ${site.agency}`),
      site,
    }, [site.name, site.nameTr, site.agency, site.agencyTr, site.bodyId, site.kind ?? 'landing'])
  }

  for (const event of sources.earthEvents ?? []) {
    add({
      kind: 'earth-event',
      id: `event-${event.id}`,
      title: event.title,
      subtitle: withKindLabel(language, 'earth-event', event.subtitle),
      event,
    }, [event.title, event.subtitle, event.kind])
  }

  for (const body of NAMED_SMALL_BODIES) {
    add({
      kind: 'small-body',
      id: `small-body-${body.id}`,
      title: language === 'tr' ? body.nameTr : body.name,
      subtitle: withKindLabel(language, 'small-body', body.kind),
      body,
    }, [body.id, body.name, body.nameTr, body.kind])
  }

  for (const approach of sources.closeApproaches ?? []) {
    add({
      kind: 'close-approach',
      id: `approach-${approach.designation}-${approach.closeApproachDate}`,
      title: approach.fullName,
      subtitle: withKindLabel(language, 'close-approach', `${approach.distanceAu.toFixed(4)} AU`),
      approach,
    }, [approach.designation, approach.fullName, approach.closeApproachDate])
  }

  for (const probe of DEEP_SPACE_PROBES) {
    add({
      kind: 'mission',
      id: `mission-${probe.id}`,
      title: language === 'tr' ? probe.nameTr : probe.name,
      subtitle: withKindLabel(language, 'mission', `${probe.launchYear}`),
      probe,
    }, [probe.id, probe.name, probe.nameTr, probe.statusTr])
  }

  for (const constellation of IAU_CONSTELLATIONS) {
    add({
      kind: 'constellation',
      id: `constellation-${constellation.abbreviation}`,
      title: constellation.name,
      subtitle: withKindLabel(
        language,
        'constellation',
        `${constellation.abbreviation} · ${constellation.englishName}`,
      ),
      constellation,
    }, [constellation.name, constellation.abbreviation, constellation.englishName])
  }

  return ranked
    .sort((a, b) => a.score - b.score || a.searchable.localeCompare(b.searchable))
    .slice(0, limit)
    .map(({ result }) => result)
}
