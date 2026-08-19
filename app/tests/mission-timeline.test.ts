import assert from 'node:assert/strict'
import test from 'node:test'
import { LANDING_SITES } from '../src/lib/landing-sites.ts'
import {
  MISSION_EVENTS,
  NSSDCA_MASTER_CATALOG_URL,
  getMissionTimeline,
  groupMissionEventsByDecade,
  missionEventTimeMs,
  missionEventYear,
} from '../src/lib/mission-timeline.ts'
import { getAllBodyIds } from '../src/lib/planets.ts'

test('every mission event is sourced, dated, and aimed at a modelled body', () => {
  const bodyIds = new Set<string>(getAllBodyIds())
  const siteIds = new Set(LANDING_SITES.map((site) => site.id))
  const seen = new Set<string>()

  for (const event of MISSION_EVENTS) {
    assert.ok(!seen.has(event.id), `duplicate event id: ${event.id}`)
    seen.add(event.id)
    assert.match(event.at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, `${event.id} timestamp`)
    assert.ok(Number.isFinite(missionEventTimeMs(event)), `${event.id} parses`)
    assert.ok(event.sourceUrl.startsWith(NSSDCA_MASTER_CATALOG_URL), `${event.id} source`)
    assert.ok(bodyIds.has(event.targetBody), `${event.id} targets ${event.targetBody}`)
    assert.ok(event.titleTr.length > 5 && event.titleEn.length > 5, `${event.id} titles`)
    if (event.landingSiteId) {
      assert.ok(siteIds.has(event.landingSiteId), `${event.id} site ${event.landingSiteId}`)
    }
  }
})

test('landing events always anchor to a surface site on the body they land on', () => {
  for (const event of MISSION_EVENTS) {
    if (event.kind !== 'landing') continue
    assert.ok(event.landingSiteId, `${event.id} landing needs a site`)
    const site = LANDING_SITES.find((candidate) => candidate.id === event.landingSiteId)
    assert.ok(site, `${event.id} site exists`)
    assert.equal(site.bodyId, event.targetBody, `${event.id} site sits on the target body`)
  }
})

test('the timeline is chronological and grouped by decade', () => {
  const timeline = getMissionTimeline()
  const times = timeline.map(missionEventTimeMs)
  assert.deepEqual(times, [...times].sort((a, b) => a - b))
  assert.equal(timeline.length, MISSION_EVENTS.length)

  const decades = groupMissionEventsByDecade()
  const decadeKeys = decades.map((group) => group.decade)
  assert.deepEqual(decadeKeys, [...decadeKeys].sort((a, b) => a - b))
  assert.equal(
    decades.reduce((sum, group) => sum + group.events.length, 0),
    MISSION_EVENTS.length,
  )
  for (const group of decades) {
    for (const event of group.events) {
      assert.equal(Math.floor(missionEventYear(event) / 10) * 10, group.decade)
    }
  }
})

test('a malformed timestamp raises instead of sorting as NaN', () => {
  assert.throws(
    () =>
      missionEventTimeMs({
        ...MISSION_EVENTS[0],
        at: 'not-a-date',
      }),
    /unparsable timestamp/,
  )
})
