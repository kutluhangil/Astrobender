# Evidence-First Observatory Design

## Objective

Turn ASTROBENDER into an evidence-first observatory where every displayed claim is either retrieved from a named primary source, calculated by a named model with an explicit epoch and validity boundary, or clearly isolated as a schematic visualization. Unknown values and source failures remain visible and are never replaced by invented precision.

## Product contract

- Default science views may contain only `live`, `calculated`, or `sourced-static` data.
- `schematic` and `heuristic` content must be opt-in, explicitly labelled, and visually distinct from scientific measurements.
- A missing measurement is rendered as an explicit unknown value. It must not be estimated unless a primary source publishes the estimate and uncertainty.
- A failed refresh keeps the last valid payload but preserves its original source timestamp and exposes the failure.
- Every value group exposes its publisher, source URL, verification date, method, epoch or observation time where applicable, and uncertainty or limitation.
- User location is requested only after an explicit action, remains in local browser storage, and is never transmitted by ASTROBENDER.
- Turkish and English copy must make the same scientific claim.

## Data classification

```ts
export type EvidenceClass =
  | 'live'
  | 'calculated'
  | 'sourced-static'
  | 'schematic'
  | 'heuristic'
```

`live` means a current upstream payload with its upstream or fetch timestamp. `calculated` means a deterministic result from a named model such as Astronomy Engine or SGP4. `sourced-static` means a reviewed primary-source value stored in the repository. `schematic` means a non-catalog visual aid. `heuristic` means a product-authored score or classification and may not be presented as a scientific measurement.

## Evidence record

```ts
export interface EvidenceRecord {
  evidenceClass: EvidenceClass
  publisher: string
  sourceUrl: string
  retrievedAt?: string
  verifiedAt: string
  method?: string
  epoch?: string
  validFrom?: string
  validUntil?: string
  uncertainty?: string
  limitation?: string
}
```

Scientific catalog records consume evidence records rather than a single global review date. Asset provenance uses a separate file-level record containing source page, publisher, license or usage policy, retrieval date, SHA-256, and transformation notes.

## Runtime architecture

```text
Primary source -> allow-listed server adapter -> schema validation -> timestamped cache
                                                           |
Repository evidence registry -> domain catalog ------------+-> UI evidence badge/details
                                                           |
Named calculation model -> method + epoch -----------------+
```

The client never silently switches from a failed live source to fabricated data. Packaged snapshots are allowed only when they carry their real download timestamp and are labelled `sourced-static` or cached data, never `live`.

## Scientific corrections

- Replace the root JPL proxy re-export with a deployable handler and explicit 502/504 failure responses.
- Split liveness from dependency readiness; readiness reports the actual TLE and JPL adapter state.
- Permit same-origin geolocation and correct privacy copy.
- Preserve original live-data timestamps through refresh failures.
- Replace generic annual meteor templates with year-specific IMO records. Unsupported years show no event rather than a guessed time.
- Correct the Uranus moon count using the NASA Webb S/2025 U1 announcement.
- Reconcile duplicated physical descriptions and the scale sandbox against one catalog.
- Replace probe straight-line display positions with JPL Horizons-derived records or remove the plotted position when a supported ephemeris is unavailable.
- Migrate CelesTrak ingestion toward OMM-compatible CSV while retaining tested SGP4 propagation.
- Remove unsupported constellation line figures and default synthetic belt particles from the science view; an optional schematic mode may retain clearly labelled educational geometry.

## Interface design

Evidence status appears as a compact instrument readout, not a marketing badge:

```text
[LIVE · USGS · 1m]      current upstream payload
[CALC · SGP4 · 14:32Z] deterministic model and epoch
[SOURCE · JPL · 2026]  repository value reviewed against a source
[SCHEMATIC]             opt-in educational visualization
[HEURISTIC]             product-authored guidance, never a scientific score
```

Opening the readout reveals publisher, direct source, observation/fetch time, method, validity range, uncertainty, and limitation. Errors name the failed source and keep the last valid source time visible.

## Delivery phases

1. Production truth: repair deployed APIs, readiness, geolocation, timestamps, and immediate false claims.
2. Scientific truth: remove guessed meteor events and reconcile catalog/profile/scale/site/constellation claims.
3. Evidence system: introduce field-level evidence records, evidence UI, and file-level asset provenance.
4. Live adapters: add year-specific IMO data, JPL Horizons mission records, and CelesTrak OMM-compatible ingestion without fabricated fallback.
5. Product hardening: repair panel/search/a11y flows, worker failure semantics, performance budgets, CI evidence, production smoke, and service-worker deploy transitions.
6. Research and communication: publish the primary-source research report, roadmap, and a technical/product presentation.

Each phase ends with targeted tests, the complete `npm run verify:ci` gate, a single user-authored commit, and a push to `main`.

## Acceptance criteria

- Production JPL and readiness endpoints return actionable, tested responses.
- No UI text claims that a calculated, cached, static, schematic, or heuristic value is live.
- No annual astronomical event is assigned an unsupported exact timestamp.
- No stale payload receives a new source timestamp after a failed refresh.
- Every selectable celestial body and every bundled runtime asset has traceable provenance.
- Schematics are absent from the default science view or explicitly opt-in.
- Unit, lint, source, attribution, dependency, build, Chromium, PWA, and production smoke gates pass.
- The final report and slide deck cite only primary sources and accurately describe remaining limitations.
