# ASTROBENDER Observatory Expansion Design

## Purpose

Expand ASTROBENDER from a polished 3D orbital viewer into a sourced Solar
System and Earth-observation experience without changing its established
visual identity or damaging the current Earth and satellite presentation.

## Product constraints

- Preserve the current Earth materials, camera composition, HUD character,
  compact glowing satellite points, time controls, and compressed-distance
  navigation.
- New data-heavy capabilities are opt-in layers and must not make the default
  scene visually noisy.
- Planet and moon positions remain navigable and schematic in scale. Every
  approximate or compressed value is labeled as such.
- Live integrations expose their source, observation time, loading state, and
  actionable error. They never silently replace scientific data with invented
  values.
- No new secret or paid API dependency is required for the baseline
  experience.
- Turkish and English UI copy are served from one typed localization catalog.
- Each phase is independently testable, committed, and pushed without
  co-author metadata.

## Architecture

### Celestial catalog

Create one typed celestial catalog that owns physical facts, orbit metadata,
display information, source links, verification dates, missions, rings, and
surface sites. Existing planet rendering and information panels consume this
catalog instead of maintaining conflicting copies.

Detailed bodies use normal Three.js meshes. Scientifically important moons
receive selectable meshes and mean J2000 orbital elements. Remaining confirmed
moons are represented by a low-cost catalog-point layer grouped by parent
planet, keeping the scene readable.

### Earth Observatory

Earth Observatory is a separate HUD module with three independent data groups:

- Earth events: NASA EONET natural events and USGS earthquakes.
- Space weather: NOAA SWPC auroral oval and current geomagnetic measurements.
- Earth imagery: NASA GIBS daily imagery metadata and an optional globe
  overlay.

Network clients validate payloads, use bounded timeouts, cache the last valid
response, and return explicit source-state objects. The original static Earth
textures remain the visual baseline.

### Small bodies and missions

JPL SBDB close-approach data supplies real selectable near-Earth objects.
Mission records use JPL Horizons vectors when available and clearly labeled
catalog snapshots otherwise. Existing synthetic belts remain an ambient
visualization and are renamed accordingly so they are not presented as real
object locations.

### Search and localization

One command-style search index covers satellites, celestial bodies, missions,
surface sites, Earth events, and small bodies. Results are grouped by type and
invoke the existing focus APIs.

All new and existing HUD labels move to typed `tr` and `en` catalogs. The
cinematic narration selector becomes the global interface language selector
while retaining separate narration readiness.

### Performance and testing

Initial Earth and Moon textures keep their current appearance but load through
resolution-aware texture manifests. Lower-resolution startup assets are used
when device capability or viewport size requires them; high-resolution maps
load on demand for close focus.

Unit tests cover catalog integrity, data validation, orbit math, localization,
and search. Browser tests cover body focus, stale coordinate cleanup, Earth
exposure, Observatory state, and fallback behavior.

## Visual behavior

- The default screen remains the current dark-space Earth view.
- Observatory markers use the same restrained cyan/amber/red instrumentation
  language and are hidden until enabled.
- Earth bloom is reduced only enough to retain surface detail at the subsolar
  region; atmospheric rim and city/satellite points remain unchanged.
- Rings are thin, physically tilted child meshes. Uranus, Neptune, and Jupiter
  rings are much fainter than Saturn's.
- Small moons and NEOs use tiny emissive markers at wide zoom and become
  selectable only above a practical screen-size threshold.

## Error handling

- HTTP errors include source name, URL, status, and response excerpt.
- Payload validation errors identify the missing or invalid field.
- Cached data is labeled with its fetch time and age.
- A source failure affects only its own layer; the core 3D scene continues.
- Unsupported dates outside an ephemeris validity window are visibly labeled
  rather than silently clamped.

## Acceptance criteria

- Existing Earth composition and satellite markers remain visually
  recognizable.
- Selecting another body clears stale coordinates and surface state.
- Pluto and Charon orbit their shared barycentric system; Pluto's five moons
  are represented.
- All eight planets show their known ring status and major moons.
- Earth Observatory can display EONET events, USGS earthquakes, and NOAA space
  weather independently.
- Real JPL close approaches are searchable and selectable.
- Facts have source URLs and verification dates; duplicated fact tables are
  removed.
- Search covers every supported entity type.
- Turkish and English HUD modes are complete.
- Test, lint, build, and browser regression checks pass at the end of every
  implementation phase.
