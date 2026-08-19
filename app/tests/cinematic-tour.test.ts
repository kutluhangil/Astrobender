import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CINEMATIC_TOUR_CUES,
  CINEMATIC_TOUR_SCRIPT_DURATION_S,
  getCinematicTourCueIndex,
  getCinematicTourCueWindow,
} from '../src/lib/cinematic-tour.ts'

test('cinematic tour preserves the supplied narration order', () => {
  assert.deepEqual(
    CINEMATIC_TOUR_CUES.map((cue) => cue.bodyId),
    ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'titan', 'uranus', 'neptune', 'pluto'],
  )
})

test('cinematic tour timecodes scale to the final narration duration', () => {
  const audioDurationS = 423.888938
  const mercuryStartS = (34 / CINEMATIC_TOUR_SCRIPT_DURATION_S) * audioDurationS
  const plutoStartS = (239 / CINEMATIC_TOUR_SCRIPT_DURATION_S) * audioDurationS

  assert.equal(getCinematicTourCueIndex(0, audioDurationS), 0)
  assert.equal(getCinematicTourCueIndex(mercuryStartS - 0.001, audioDurationS), 0)
  assert.equal(getCinematicTourCueIndex(mercuryStartS, audioDurationS), 1)
  assert.equal(getCinematicTourCueIndex(plutoStartS, audioDurationS), 11)

  const plutoWindow = getCinematicTourCueWindow(11, audioDurationS)
  assert.ok(Math.abs(plutoWindow.startS - plutoStartS) < 1e-9)
  assert.ok(Math.abs(plutoWindow.durationS - (audioDurationS - plutoStartS)) < 1e-9)
})
