import type { CelestialBodyId } from './planets'

// The tour timing is an authored visual sequence. It has no bundled
// narration or observational-media dependency.
export const CINEMATIC_TOUR_SCRIPT_DURATION_S = 273

export interface CinematicTourCue {
  bodyId: CelestialBodyId
  scriptStartS: number
}

// These cues are the authored stops in the visual sequence. Runtime duration
// is deliberately fixed by the caller rather than derived from media metadata.
export const CINEMATIC_TOUR_CUES: readonly CinematicTourCue[] = [
  { bodyId: 'sun', scriptStartS: 0 },
  { bodyId: 'mercury', scriptStartS: 34 },
  { bodyId: 'venus', scriptStartS: 50 },
  { bodyId: 'earth', scriptStartS: 70 },
  { bodyId: 'moon', scriptStartS: 90 },
  { bodyId: 'mars', scriptStartS: 107 },
  { bodyId: 'jupiter', scriptStartS: 133 },
  { bodyId: 'saturn', scriptStartS: 157 },
  { bodyId: 'titan', scriptStartS: 179 },
  { bodyId: 'uranus', scriptStartS: 199 },
  { bodyId: 'neptune', scriptStartS: 219 },
  { bodyId: 'pluto', scriptStartS: 239 },
]

export const TOUR_SEQUENCE = CINEMATIC_TOUR_CUES.map((cue) => cue.bodyId)

export function getCinematicTourCueIndex(visualElapsedS: number, visualDurationS: number): number {
  if (!Number.isFinite(visualDurationS) || visualDurationS <= 0) return 0
  const scriptElapsedS = visualElapsedS * (CINEMATIC_TOUR_SCRIPT_DURATION_S / visualDurationS)
  let index = 0

  for (let i = 1; i < CINEMATIC_TOUR_CUES.length; i += 1) {
    if (scriptElapsedS + 1e-9 < CINEMATIC_TOUR_CUES[i].scriptStartS) break
    index = i
  }

  return index
}

export function getCinematicTourCueWindow(
  cueIndex: number,
  visualDurationS: number,
): { startS: number; durationS: number } {
  const scale = visualDurationS / CINEMATIC_TOUR_SCRIPT_DURATION_S
  const cue = CINEMATIC_TOUR_CUES[cueIndex]
  const nextCue = CINEMATIC_TOUR_CUES[cueIndex + 1]
  const startS = cue.scriptStartS * scale
  const endS = nextCue ? nextCue.scriptStartS * scale : visualDurationS

  return { startS, durationS: Math.max(0.001, endS - startS) }
}
