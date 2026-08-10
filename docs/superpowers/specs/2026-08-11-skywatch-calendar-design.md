# Skywatch Calendar Design

## Purpose

Add a bilingual, continuously refreshed Skywatch Calendar to ASTROBENDER.
It turns the visual language in the supplied references — a compelling image,
an event date, and practical observation guidance — into an interactive,
source-backed observatory tool rather than a static social-media-style feed.

## Product constraints

- The calendar finds events relative to the current date every time it opens;
  a manually maintained month-by-month content list is not acceptable.
- It must cover solar and lunar eclipses, major meteor showers, maximum
  elongations of Mercury and Venus, and planet conjunctions/oppositions.
- Event information must be clear about whether it is globally predicted or
  visible from the selected observer location. It must never imply Turkish
  visibility for an event that is not visible there.
- The existing dark, calm instrumentation aesthetic remains. The supplied
  Instagram screenshots are content references only; no social chrome,
  follower UI, engagement counters, or copied branding is introduced.
- Event prediction must work without a network. Source references and any
  optional source verification may use the network, but an unavailable
  request must not remove calculated events.
- No location is silently assumed. The user explicitly grants browser
  geolocation or selects a city/coordinates; without one, cards display
  global facts and ask for a location before making local claims.
- All new UI is Turkish and English, keyboard accessible, responsive, and
  respects reduced-motion preferences.

## Architecture

### Event engine

Introduce the small, zero-runtime-service `astronomy-engine` TypeScript
dependency. A pure `sky-events.ts` module will derive a rolling 90-day window
from a supplied clock value and observer value. It will calculate:

- next global and local solar eclipses;
- next lunar eclipses;
- Mercury and Venus maximum elongations;
- significant conjunctions and oppositions;
- event-specific rise/set or horizon guidance when an observer exists.

The engine will return typed `SkyEvent` objects containing an id, kind,
instant/range, display title and summary in both languages, applicable body,
observer-visibility status, source URLs, and a deterministic action target.
Astronomy Engine derives these from VSOP87/NOVAS-based models; each card also
links to the applicable NASA/JPL explanatory source. Its calculations are
validated in the project against NASA-published 2026 eclipse dates.

Meteor showers are represented separately as a typed, sourced stream catalog
with a recurrence rule, expected peak window, parent body, hemisphere note,
and observing guidance. The calendar materializes only the next applicable
peak from that catalog, so the same code refreshes across months and years.
It does not claim an exact hourly rate when no fresh authoritative forecast
exists.

### Observer location

Introduce a compact `SkywatchLocationControl` inside the calendar. It offers
an explicit geolocation request and manual latitude/longitude input, stores a
confirmed selection locally, and identifies the selected location in the UI.
When the permission request fails or is declined, it displays the browser
error and leaves cards in global mode; it never substitutes a hidden default.

### UI and scene integration

Add a `SkywatchPanel` opened from the existing Layer Panel next to Earth
Observatory and Small Bodies. On desktop it shares the existing right-hand
panel dock; on mobile it uses the established bottom-sheet placement.

The panel header shows the active month, event count, selected observer state,
and calculation time. A quiet chronological rail holds event cards. Each card
has a semantic event glyph, a countdown, source line, concise observation
guidance, and one direct action:

- **Simülasyonda göster / Show in simulation** sets the simulation clock to
  the event instant and focuses the relevant body or Earth.

The panel deliberately reserves the vivid treatment for the next event:
the card’s glyph and a short animated timeline signal use cyan for orbital
events, amber for solar events, violet for lunar events, and soft white for
meteor events. The rest of the HUD stays visually restrained.

Skywatch events are added to unified search with a dedicated result group.
The 3D scene receives no persistent decorative marker layer; scene changes
occur only after a user selects an event.

### Freshness and source state

Predictions recompute from `Date.now()` whenever the panel opens, the month
changes, or the app resumes after a day boundary. The calculation time and
the latest user-selected observer location are visible in the panel.

NASA/JPL source links are reference metadata, not required network calls. If
the application later introduces an explicit remote verification endpoint,
its cache age, HTTP failures, and retry action will join the existing LIVE
information port rather than placing a persistent alert over the scene.

## Error handling

- Invalid manual latitude/longitude blocks calculation and names the invalid
  field and allowed range.
- Geolocation denial, unavailable position, or timeout is shown inline with
  the browser-provided reason and a manual-entry path.
- An event-engine calculation failure is surfaced with event type and date;
  it is not swallowed or replaced with an invented event.
- No event in the selected range is an explicit, calm empty state with month
  navigation; it is not a failure.
- A date outside the supported computation range is visibly rejected rather
  than silently clamped.

## Testing

- Unit tests cover chronological sorting, rolling-window boundaries,
  localization, unique event ids, observer validation, recurrence rules, and
  global/local visibility labels.
- Deterministic tests verify the 12 August 2026 total solar eclipse and the
  27–28 August 2026 partial lunar eclipse against NASA-published dates.
- Browser tests open the panel, choose a manual observer, exercise the
  simulation action, verify focus/time transition, and check mobile
  presentation plus keyboard operation.
- Full regression remains `npm test`, `npm run lint`, `npm run build`, and
  the relevant Playwright suite.

## Non-goals

- Weather/cloud prediction, telescope booking, push notifications, social
  feeds, and user accounts are not part of this feature.
- The panel will not render photographic event imagery or reproduce the
  supplied social-media compositions.
