# Skywatch Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual, locally calculated Skywatch Calendar that refreshes monthly, respects a user-selected observer location, and can move ASTROBENDER’s simulation to an event.

**Architecture:** A pure `sky-events.ts` module calculates a 90-day chronological event window from a supplied date and optional observer, backed by Astronomy Engine plus a narrowly scoped recurring meteor-stream catalog. A location hook owns explicit browser permission, validation, and local persistence. `SkywatchPanel` renders the result; `Home` owns visibility and the simulation action, while unified search receives the same event list.

**Tech Stack:** React 19, TypeScript 5, Tailwind CSS 3, Three.js, `astronomy-engine`, Node test runner, Playwright.

## Global Constraints

- Predictions recalculate relative to the current date; do not create manually authored month pages.
- Support eclipses, major meteor showers, Mercury/Venus maximum elongations, conjunctions, and oppositions.
- Do not imply local visibility without an explicit location; display a global result plus a visible request for location instead.
- Preserve the calm dark ASTROBENDER HUD; do not replicate social-media UI or the supplied imagery.
- No new secret, paid API, remote event feed, account, or background notification service.
- All user-facing copy is Turkish and English; errors identify the failing field, event, or browser reason.
- Do not commit or push unless the user later asks explicitly.

---

## File structure

| File | Responsibility |
| --- | --- |
| `app/src/lib/sky-events.ts` | Pure astronomy prediction, source metadata, bilingual event copy, and meteor recurrence rules. |
| `app/src/lib/skywatch-location.ts` | Observer types, local-storage schema, coordinate validation, and human-readable validation errors. |
| `app/src/hooks/useSkywatchLocation.ts` | Explicit geolocation request, persisted observer selection, and inline permission/error state. |
| `app/src/components/hud/SkywatchPanel.tsx` | Accessible month rail, location controls, card rendering, source links, and simulation action. |
| `app/src/hooks/useSimClock.ts` | Adds exact time seeking for a selected Skywatch event. |
| `app/src/lib/unified-search.ts` | Adds `sky-event` result type and indexes supplied event cards. |
| `app/src/components/hud/SearchBox.tsx` | Forwards Skywatch events to unified search and renders their icon. |
| `app/src/components/hud/LayerPanel.tsx` | Adds the Skywatch Calendar toggle alongside the existing observatory controls. |
| `app/src/pages/Home.tsx` | Owns calculated events, panel state, panel/search inputs, and focus/time transitions. |
| `app/tests/sky-events.test.ts` | Deterministic prediction, recurrence, chronology, localization, and known-2026 regression tests. |
| `app/tests/skywatch-location.test.ts` | Coordinate and persisted-observer validation tests. |
| `app/tests/unified-search.test.ts` | Skywatch search result regression. |
| `app/e2e/observatory.spec.ts` | Full visible panel, manual observer, keyboard, simulation, and mobile behavior. |
| `app/package.json`, `app/package-lock.json` | Adds the local astronomy calculation dependency and test entries. |
| `CHANGELOG.md` | One concise user-visible feature entry after the implementation passes validation. |

### Task 1: Install the deterministic event engine and implement event prediction

**Files:**
- Modify: `app/package.json`
- Modify: `app/package-lock.json`
- Create: `app/src/lib/sky-events.ts`
- Create: `app/tests/sky-events.test.ts`

**Interfaces:**
- Produces `SkyEventKind`, `SkyEvent`, `SkyObserver`, `getSkyEvents({ start, end, observer, language })`, and `getSkyEventTarget(event)` from `sky-events.ts`.
- `SkyEvent` must include `id`, `kind`, `startsAt`, `endsAt`, `title`, `summary`, `guidance`, `sourceUrl`, `targetBody`, and `visibility`.
- Later tasks consume `SkyEvent[]` without importing Astronomy Engine directly.

- [ ] **Step 1: Add failing deterministic tests for ordering, sources, known eclipses, elongation, and meteor recurrence.**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { getSkyEvents } from '../src/lib/sky-events.ts'

test('Skywatch includes NASA-verified August 2026 eclipses in chronological order', () => {
  const events = getSkyEvents({
    start: new Date('2026-08-01T00:00:00Z'),
    end: new Date('2026-08-31T23:59:59Z'),
    language: 'tr',
  })
  assert.ok(events.some((event) => event.kind === 'solar-eclipse' && event.startsAt.startsWith('2026-08-12')))
  assert.ok(events.some((event) => event.kind === 'lunar-eclipse' && event.startsAt.startsWith('2026-08-27')))
  assert.ok(events.some((event) => event.kind === 'meteor-shower' && /Perseid/i.test(event.title)))
  assert.deepEqual([...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map((event) => event.id), events.map((event) => event.id))
  assert.ok(events.every((event) => event.sourceUrl.startsWith('https://')))
})
```

- [ ] **Step 2: Run the focused test to confirm it fails because the module does not exist.**

Run: `npm test -- --test-name-pattern="Skywatch includes"`

Expected: FAIL with an import-resolution error for `sky-events.ts`.

- [ ] **Step 3: Add the dependency to the project only.**

Run: `npm install astronomy-engine@2.1.19`

Expected: `app/package.json` lists `astronomy-engine` under `dependencies` and the lockfile records the same resolved version; no global installation occurs.

- [ ] **Step 4: Implement the pure event module with a typed result.**

```ts
export type SkyEventKind =
  | 'solar-eclipse'
  | 'lunar-eclipse'
  | 'meteor-shower'
  | 'maximum-elongation'
  | 'conjunction'
  | 'opposition'

export interface SkyObserver { latitude: number; longitude: number; label: string }

export interface SkyEvent {
  id: string
  kind: SkyEventKind
  startsAt: string
  endsAt: string | null
  title: string
  summary: string
  guidance: string
  sourceUrl: string
  targetBody: 'earth' | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn'
  visibility: 'global' | 'local-visible' | 'local-not-visible' | 'location-required'
}

export function getSkyEvents(input: {
  start: Date
  end: Date
  observer?: SkyObserver
  language: 'tr' | 'en'
}): SkyEvent[]
```

Use `SearchGlobalSolarEclipse`, `SearchLocalSolarEclipse`, `SearchLunarEclipse`, `SearchMaxElongation`, and `SearchRelativeLongitude` only inside this module. Materialize the next occurrence of each typed meteor stream only when its peak falls inside the requested range. Sort by `startsAt`, remove duplicate ids, and throw an error that includes the invalid start/end values when `end <= start`.

- [ ] **Step 5: Add focused tests for invalid date range and location-required state.**

```ts
test('Skywatch rejects an inverted window and labels unlocated solar visibility', () => {
  assert.throws(
    () => getSkyEvents({ start: new Date('2026-09-01T00:00:00Z'), end: new Date('2026-08-01T00:00:00Z'), language: 'en' }),
    /end.*start/i,
  )
  const events = getSkyEvents({ start: new Date('2026-08-01T00:00:00Z'), end: new Date('2026-08-31T00:00:00Z'), language: 'en' })
  assert.equal(events.find((event) => event.kind === 'solar-eclipse')?.visibility, 'location-required')
})
```

- [ ] **Step 6: Run the Skywatch test file and the existing unit suite.**

Run: `npm test -- --test-name-pattern="Skywatch" && npm test`

Expected: both commands pass; the existing orbital, search, observatory, and PWA tests remain green.

### Task 2: Add explicit observer persistence and geolocation state

**Files:**
- Create: `app/src/lib/skywatch-location.ts`
- Create: `app/src/hooks/useSkywatchLocation.ts`
- Create: `app/tests/skywatch-location.test.ts`
- Modify: `app/package.json`

**Interfaces:**
- Consumes `SkyObserver` from `sky-events.ts`.
- Produces `parseSkywatchObserver(value: string): SkyObserver | null`, `validateSkywatchCoordinates(latitude, longitude): SkyObserver`, and `useSkywatchLocation()`.
- `useSkywatchLocation()` returns `{ observer, error, requestBrowserLocation, saveManualLocation, clearLocation }`.

- [ ] **Step 1: Write coordinate validation and malformed-storage tests.**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { parseSkywatchObserver, validateSkywatchCoordinates } from '../src/lib/skywatch-location.ts'

test('Skywatch location validates coordinate ranges and rejects corrupt storage', () => {
  assert.deepEqual(validateSkywatchCoordinates(41.0082, 28.9784, 'Istanbul'), {
    latitude: 41.0082,
    longitude: 28.9784,
    label: 'Istanbul',
  })
  assert.throws(() => validateSkywatchCoordinates(91, 28, 'Invalid'), /latitude.*-90.*90/i)
  assert.equal(parseSkywatchObserver('{invalid json}'), null)
})
```

- [ ] **Step 2: Run the new test and confirm it fails before implementation.**

Run: `npm test -- --test-name-pattern="Skywatch location validates"`

Expected: FAIL with an import-resolution error for `skywatch-location.ts`.

- [ ] **Step 3: Implement validation and local persistence primitives.**

```ts
export const SKYWATCH_LOCATION_STORAGE_KEY = 'astrobender.skywatch-location.v1'

export function validateSkywatchCoordinates(latitude: number, longitude: number, label: string): SkyObserver {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error(`Skywatch latitude must be between -90 and 90; received ${latitude}`)
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error(`Skywatch longitude must be between -180 and 180; received ${longitude}`)
  }
  if (!label.trim()) throw new Error('Skywatch location label is required')
  return { latitude, longitude, label: label.trim() }
}
```

`parseSkywatchObserver` must return `null` only for absent/corrupt storage and must reject extra malformed fields. The hook must call `navigator.geolocation.getCurrentPosition` only from its explicit action, turn browser errors into visible strings, and use `localStorage` only through the validated serialization helpers.

- [ ] **Step 4: Run the focused location tests.**

Run: `npm test -- --test-name-pattern="Skywatch location"`

Expected: PASS.

### Task 3: Build the responsive Skywatch panel and location controls

**Files:**
- Create: `app/src/components/hud/SkywatchPanel.tsx`
- Modify: `app/src/index.css`

**Interfaces:**
- Consumes `SkyEvent` and `SkyObserver`.
- `SkywatchPanelProps` is `{ events: SkyEvent[]; observer: SkyObserver | null; locationError: string | null; language: UiLanguage; onRequestBrowserLocation(): void; onSaveManualLocation(latitude: number, longitude: number, label: string): void; onClearLocation(): void; onSelectEvent(event: SkyEvent): void; onClose(): void }`.
- Produces an accessible `section` named `Gökyüzü Takvimi` / `Skywatch Calendar` and a button named `Simülasyonda göster` / `Show in simulation` per event.

- [ ] **Step 1: Create the panel with deterministic, accessible states.**

```tsx
export default function SkywatchPanel({ events, observer, locationError, language, onRequestBrowserLocation, onSaveManualLocation, onClearLocation, onSelectEvent, onClose }: SkywatchPanelProps) {
  return (
    <section aria-label={pickLanguage(language, 'Gökyüzü Takvimi', 'Skywatch Calendar')} data-hud-surface>
      <header>{/* title, calculation time, close action */}</header>
      <SkywatchLocationControl /* explicit browser + manual actions */ />
      <ol>{events.map((event) => <SkywatchEventCard key={event.id} event={event} onSelect={() => onSelectEvent(event)} />)}</ol>
    </section>
  )
}
```

Use only real event data to render cards. Provide an explicit empty state when `events.length === 0`, show local status beside each event, and use `<a href={event.sourceUrl}>` with `target="_blank" rel="noreferrer"` for source transparency. Do not add event photography, fake radar, or social controls.

- [ ] **Step 2: Add the reduced-motion-safe timeline CSS.**

```css
.skywatch-event--next::before { animation: skywatch-signal 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .skywatch-event--next::before { animation: none; }
}
```

The panel must use the existing HUD colors and mobile width constraints (`max-w-[calc(100vw-24px)]`, `max-h-[44vh]`) instead of creating a full-screen social feed.

- [ ] **Step 3: Run lint to catch component and accessibility issues before wiring it into Home.**

Run: `npm run lint`

Expected: PASS with no unused panel props or hook-rule violations.

### Task 4: Integrate Skywatch with the clock, layer controls, search, and scene focus

**Files:**
- Modify: `app/src/hooks/useSimClock.ts`
- Modify: `app/src/components/hud/LayerPanel.tsx`
- Modify: `app/src/lib/unified-search.ts`
- Modify: `app/src/components/hud/SearchBox.tsx`
- Modify: `app/src/pages/Home.tsx`
- Modify: `app/tests/unified-search.test.ts`

**Interfaces:**
- Adds `setTime(timeMs: number): void` to `SimClock`; it reanchors at `timeMs`, switches to 1×, and resumes playback.
- Adds `'sky-event'` to `UnifiedSearchResult` as `{ kind: 'sky-event'; id: string; title: string; subtitle: string; event: SkyEvent }`.
- Adds `skyEvents?: SkyEvent[]` to `UnifiedSearchSources` and `SearchBoxProps`.
- Adds `onToggleSkywatch?: () => void` and `skywatchVisible?: boolean` to `LayerPanelProps`.

- [ ] **Step 1: Write a failing unified-search regression.**

```ts
test('unified search exposes current Skywatch events', () => {
  const result = searchObservatory('Perseid', {
    satellites: SATELLITES,
    earthEvents: [],
    closeApproaches: [],
    skyEvents: [{ id: 'meteor-perseids-2026', kind: 'meteor-shower', title: 'Perseid Meteor Yağmuru', subtitle: '', guidance: '', startsAt: '2026-08-12T00:00:00.000Z', endsAt: null, sourceUrl: 'https://science.nasa.gov/', targetBody: 'earth', visibility: 'global' }],
  }, 'tr')[0]
  assert.equal(result?.kind, 'sky-event')
})
```

- [ ] **Step 2: Run the regression to verify it fails.**

Run: `npm test -- --test-name-pattern="unified search exposes current Skywatch"`

Expected: FAIL because `skyEvents` and `sky-event` are not yet supported.

- [ ] **Step 3: Add the simulation seek method and search indexing.**

```ts
const setTime = useCallback((timeMs: number) => {
  if (!Number.isFinite(timeMs)) throw new Error(`Simulation time must be finite; received ${timeMs}`)
  simAnchor.current = timeMs
  wallAnchor.current = performance.now()
  inited.current = true
  speedRef.current = 1
  playingRef.current = true
  setSpeedState(1)
  setPlaying(true)
}, [])
```

In `Home`, calculate the 90-day window with `useMemo` from current wall time and selected observer, pass it to both `SearchBox` instances, and add a `sky-event` case that closes conflicting panels, calls `clock.setTime(Date.parse(event.startsAt))`, and focuses `event.targetBody`. The Layer Panel Skywatch action opens its panel, closes Earth Observatory and Small Bodies, and retains the existing mobile sheet behavior.

- [ ] **Step 4: Run the search regression and TypeScript build.**

Run: `npm test -- --test-name-pattern="unified search exposes current Skywatch" && npm run build`

Expected: PASS; TypeScript confirms every `UnifiedSearchResult` switch and icon map handles `sky-event`.

### Task 5: Verify user flows, regression coverage, and release notes

**Files:**
- Modify: `app/e2e/observatory.spec.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Uses the public labels created in Task 3 and the Layer Panel button created in Task 4.

- [ ] **Step 1: Add an end-to-end Skywatch flow with manual location.**

```ts
test('Skywatch calculates events, accepts a manual observer, and moves the simulation', async ({ page }) => {
  await page.getByRole('button', { name: /Gökyüzü Takvimi/ }).click()
  await expect(page.getByRole('region', { name: 'Gökyüzü Takvimi' })).toBeVisible()
  await page.getByLabel('Enlem').fill('41.0082')
  await page.getByLabel('Boylam').fill('28.9784')
  await page.getByLabel('Konum etiketi').fill('İstanbul')
  await page.getByRole('button', { name: 'Konumu kaydet' }).click()
  await expect(page.getByText('İstanbul')).toBeVisible()
  await page.getByRole('button', { name: 'Simülasyonda göster' }).first().click()
  await expect(page.getByRole('heading', { name: /Dünya|Güneş|Ay|Venüs|Merkür/ })).toBeVisible()
})
```

- [ ] **Step 2: Add mobile and reduced-motion regressions.**

```ts
test('Skywatch stays operable on mobile with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Katman panelini aç' }).click()
  await page.getByRole('button', { name: /Gökyüzü Takvimi/ }).click()
  await expect(page.getByRole('region', { name: 'Gökyüzü Takvimi' })).toBeVisible()
})
```

- [ ] **Step 3: Run the focused browser test, full checks, and inspect the diff.**

Run: `npx playwright test e2e/observatory.spec.ts --grep "Skywatch" && npm test && npm run lint && npm run build && git status --short && git --no-pager diff --stat`

Expected: focused browser coverage and all quality gates pass; the diff contains only the listed Skywatch files, package metadata, and one changelog entry.

- [ ] **Step 4: Add the completed-feature changelog entry.**

```markdown
- Added a bilingual Skywatch Calendar with locally calculated eclipses, meteor showers, planetary events, explicit observer selection, source links, and one-click simulation focus.
```

- [ ] **Step 5: Run the final validation after the changelog update.**

Run: `npm test && npm run lint && npm run build && npx playwright test e2e/observatory.spec.ts --grep "Skywatch"`

Expected: all commands pass. Report the exact command results; do not commit or push unless the user requests it.

## Plan self-review

- **Spec coverage:** Tasks 1–2 implement rolling offline prediction, meteor recurrence, exact observer choice, source metadata, and visible errors. Task 3 implements the calm bilingual panel and reduced-motion treatment. Task 4 provides panel, search, scene, and exact-time integration. Task 5 proves desktop/mobile flows and records the user-visible feature.
- **Placeholder scan:** No unfinished markers or unspecified error-handling steps remain.
- **Type consistency:** `SkyEvent` and `SkyObserver` originate in Task 1; Task 2 consumes `SkyObserver`; Task 3 consumes both; Task 4 exposes `SkyEvent` through search; Task 5 uses the public labels from Tasks 3–4.
