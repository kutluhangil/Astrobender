import assert from 'node:assert/strict'
import test from 'node:test'
import { Body, Equator, Observer } from 'astronomy-engine'
import {
  ALTITUDE_SAMPLE_MINUTES,
  ASTRONOMICAL_TWILIGHT_DEG,
  MIN_USEFUL_ALTITUDE_DEG,
  compassPoint,
  isPlannableBody,
  moonlightInterferes,
  planNightObservation,
  plannableBodyIds,
  type NightPlan,
} from '../src/lib/observation-planner.ts'

const ISTANBUL = { latitude: 41.0082, longitude: 28.9784, label: 'İstanbul' }
const TROMSO = { latitude: 69.6496, longitude: 18.956, label: 'Tromsø' }
const SVALBARD = { latitude: 78.2232, longitude: 15.6267, label: 'Svalbard' }

test('a target culminates at the altitude spherical trigonometry demands', () => {
  const plan = planNightObservation({
    bodyId: 'saturn',
    observer: ISTANBUL,
    nightOf: new Date('2026-09-15T00:00:00Z'),
  })
  assert.ok(plan.transit, 'Saturn must culminate during this night')

  // At upper culmination the altitude is 90° minus the difference between the
  // observer's latitude and the body's declination.
  const observer = new Observer(ISTANBUL.latitude, ISTANBUL.longitude, 0)
  const equatorial = Equator(Body.Saturn, new Date(plan.transit.timeMs), observer, true, true)
  const expected = 90 - Math.abs(ISTANBUL.latitude - equatorial.dec)
  assert.ok(
    Math.abs(plan.transit.altitudeDeg - expected) < 0.6,
    `Transit altitude ${plan.transit.altitudeDeg} does not match ${expected}`,
  )
  // Seen from the northern hemisphere, a body south of the zenith transits due south.
  assert.ok(
    Math.abs(plan.transit.azimuthDeg - 180) < 1,
    `Transit azimuth was ${plan.transit.azimuthDeg}`,
  )
})

test('the usable window lies inside astronomical darkness and above the altitude floor', () => {
  const plan = planNightObservation({
    bodyId: 'saturn',
    observer: ISTANBUL,
    nightOf: new Date('2026-09-15T00:00:00Z'),
  })
  assert.equal(plan.verdict, 'observable')
  assert.ok(plan.night && plan.darkness && plan.best)

  assert.ok(plan.darkness.startMs >= plan.night.startMs, 'darkness starts after sunset')
  assert.ok(plan.darkness.endMs <= plan.night.endMs, 'darkness ends before sunrise')
  assert.ok(plan.best.startMs >= plan.darkness.startMs && plan.best.endMs <= plan.darkness.endMs)

  const inWindow = plan.samples.filter(
    (sample) => sample.timeMs >= plan.best!.startMs && sample.timeMs <= plan.best!.endMs,
  )
  assert.ok(inWindow.length > 1)
  for (const sample of inWindow) {
    assert.ok(
      sample.altitudeDeg >= MIN_USEFUL_ALTITUDE_DEG,
      `Window contains a sample at ${sample.altitudeDeg}°`,
    )
  }
  // The culmination falls inside this window, so the peak is the exact transit
  // rather than the highest five-minute sample.
  assert.equal(plan.best.peakTimeMs, plan.transit!.timeMs)
  assert.ok(
    plan.best.peakAltitudeDeg >= Math.max(...inWindow.map((sample) => sample.altitudeDeg)),
    'the exact culmination is at least as high as any sample',
  )
})

test('a target that stays low during darkness is reported as such, not as observable', () => {
  // Jupiter rises only near the end of astronomical night on this date.
  const plan = planNightObservation({
    bodyId: 'jupiter',
    observer: ISTANBUL,
    nightOf: new Date('2026-09-15T00:00:00Z'),
  })
  assert.equal(plan.verdict, 'never-high-enough')
  assert.equal(plan.best, null)
  assert.ok(plan.darkness, 'the night itself is dark enough; the target is the problem')
})

test('the midnight sun and the polar night are told apart', () => {
  const midnightSun = planNightObservation({
    bodyId: 'saturn',
    observer: TROMSO,
    nightOf: new Date('2026-06-21T00:00:00Z'),
  })
  assert.equal(midnightSun.night, null)
  assert.equal(midnightSun.darkness, null)
  assert.equal(midnightSun.best, null)
  assert.equal(midnightSun.verdict, 'no-darkness')
  // The curve is still drawn, so the reader can see the target moving.
  assert.ok(midnightSun.samples.length > 100)

  const polarNight = planNightObservation({
    bodyId: 'jupiter',
    observer: SVALBARD,
    nightOf: new Date('2026-12-21T00:00:00Z'),
  })
  assert.ok(polarNight.night, 'a polar night is one long night, not the absence of one')
  assert.ok(polarNight.darkness)
  assert.ok(
    polarNight.darkness.endMs - polarNight.darkness.startMs > 12 * 60 * 60 * 1000,
    'a December night at 78°N runs far longer than twelve hours',
  )
  assert.equal(polarNight.verdict, 'observable')
})

test('the same target is planned differently from different latitudes', () => {
  const nightOf = new Date('2026-12-21T00:00:00Z')
  const south = planNightObservation({ bodyId: 'jupiter', observer: ISTANBUL, nightOf })
  const north = planNightObservation({ bodyId: 'jupiter', observer: SVALBARD, nightOf })

  assert.ok(south.darkness && north.darkness)
  assert.ok(
    north.darkness.endMs - north.darkness.startMs >
      south.darkness.endMs - south.darkness.startMs,
    'the polar site has the longer dark window',
  )
  assert.ok(
    south.best!.peakAltitudeDeg > north.best!.peakAltitudeDeg,
    'the southern site sees the same body higher',
  )
})

test('the altitude curve is evenly spaced and spans the whole night', () => {
  const plan = planNightObservation({
    bodyId: 'mars',
    observer: ISTANBUL,
    nightOf: new Date('2026-09-15T00:00:00Z'),
  })
  assert.ok(plan.night)
  assert.equal(plan.samples[0].timeMs, plan.night.startMs)
  assert.equal(plan.samples[plan.samples.length - 1].timeMs, plan.night.endMs)

  for (let index = 1; index < plan.samples.length - 1; index += 1) {
    assert.equal(
      plan.samples[index].timeMs - plan.samples[index - 1].timeMs,
      ALTITUDE_SAMPLE_MINUTES * 60_000,
    )
  }
})

test('the planner covers the bodies with an ephemeris and refuses the rest', () => {
  const ids = plannableBodyIds()
  assert.ok(ids.includes('moon') && ids.includes('neptune') && ids.includes('pluto'))
  // Night planning; solar observing is a different activity with its own rules.
  assert.ok(!ids.includes('sun'), 'the Sun is not a night target')
  assert.equal(isPlannableBody('europa'), false)
  assert.throws(
    () =>
      planNightObservation({
        bodyId: 'europa',
        observer: ISTANBUL,
        nightOf: new Date('2026-09-15T00:00:00Z'),
      }),
    /No ephemeris available for observation planning of europa/,
  )
  assert.throws(
    () =>
      planNightObservation({
        bodyId: 'mars',
        observer: ISTANBUL,
        nightOf: new Date('not a date'),
      }),
    /valid date/,
  )
})

test('the compass label wraps around north', () => {
  assert.equal(compassPoint(0, 'en'), 'N')
  assert.equal(compassPoint(359, 'en'), 'N')
  assert.equal(compassPoint(-10, 'en'), 'N')
  assert.equal(compassPoint(180, 'tr'), 'G')
  assert.equal(compassPoint(225, 'tr'), 'GB')
  assert.equal(compassPoint(90, 'tr'), 'D')
  assert.throws(() => compassPoint(Number.NaN, 'en'), /Invalid azimuth/)
})

test('moonlight is called out only when a bright Moon is actually close by', () => {
  const base = { moonIllumination: 0.95, moonSeparationDeg: 20 } as NightPlan
  assert.equal(moonlightInterferes(base), true)
  assert.equal(moonlightInterferes({ ...base, moonSeparationDeg: 120 } as NightPlan), false)
  assert.equal(moonlightInterferes({ ...base, moonIllumination: 0.1 } as NightPlan), false)
  // The Moon cannot interfere with itself.
  assert.equal(moonlightInterferes({ ...base, moonSeparationDeg: null } as NightPlan), false)
})

test('the darkness threshold is astronomical twilight, not merely sunset', () => {
  assert.equal(ASTRONOMICAL_TWILIGHT_DEG, -18)
  const plan = planNightObservation({
    bodyId: 'saturn',
    observer: ISTANBUL,
    nightOf: new Date('2026-09-15T00:00:00Z'),
  })
  assert.ok(plan.night && plan.darkness)
  // Twilight is a real slice of the night, not a rounding difference.
  assert.ok(plan.darkness.startMs - plan.night.startMs > 45 * 60 * 1000)
})

test('rise and set are reported only when they fall inside the plotted night', () => {
  const plan = planNightObservation({
    bodyId: 'jupiter',
    observer: ISTANBUL,
    nightOf: new Date('2026-09-15T00:00:00Z'),
  })
  assert.ok(plan.night)
  for (const event of [plan.rise, plan.set]) {
    if (event === null) continue
    assert.ok(
      event >= plan.night.startMs && event <= plan.night.endMs,
      `Reported event ${new Date(event).toISOString()} falls outside the night`,
    )
  }
  // Jupiter rises during this night but does not set again before sunrise.
  assert.ok(plan.rise !== null, 'Jupiter rises before dawn on this date')
  assert.equal(plan.set, null)
})
