import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LAGRANGE_COLLINEAR_SCENE_OFFSET,
  LAGRANGE_POINTS,
  TROJAN_CLOUD_COUNT,
  collinearOffsetFraction,
  getCollinearExaggeration,
  getLagrangePoints,
  getLagrangeScenePosition,
  massRatio,
  sampleTrojanCloud,
} from '../src/lib/lagrange.ts'
import { heliocentricPositionAu } from '../src/lib/orbital-mechanics.ts'

const AU_KM = 149_597_870.7
const NOW = Date.UTC(2026, 7, 19)

test('Sun-Earth collinear points land on their published distances', () => {
  const l1 = collinearOffsetFraction('earth', 'L1') * AU_KM
  const l2 = collinearOffsetFraction('earth', 'L2') * AU_KM

  // NASA quotes about 1.5 million km for both, with L1 sunward of Earth.
  assert.ok(l1 < 0, 'L1 must sit between the Earth and the Sun')
  assert.ok(l2 > 0, 'L2 must sit beyond the Earth')
  assert.ok(Math.abs(Math.abs(l1) - 1.491e6) < 5e3, `L1 distance was ${l1}`)
  assert.ok(Math.abs(l2 - 1.5015e6) < 5e3, `L2 distance was ${l2}`)
  assert.ok(Math.abs(l2) > Math.abs(l1), 'L2 is the further of the two')
})

test('mass ratios come from the modelled secondaries only', () => {
  assert.ok(Math.abs(massRatio('earth') - 3.0035e-6) < 1e-9)
  assert.ok(Math.abs(massRatio('jupiter') - 9.5366e-4) < 1e-7)
  assert.throws(() => massRatio('mars'), /No mass on record for Lagrange secondary: mars/)
})

test('triangular points lead and trail their secondary by sixty degrees', () => {
  const points = getLagrangePoints(NOW)
  assert.equal(points.length, LAGRANGE_POINTS.length)

  for (const secondary of ['earth', 'jupiter'] as const) {
    const body = heliocentricPositionAu(secondary, NOW)
    const bodyRadius = Math.hypot(body.x, body.y, body.z)
    for (const id of ['L4', 'L5'] as const) {
      const point = points.find((candidate) => candidate.secondary === secondary && candidate.id === id)
      assert.ok(point, `${secondary} ${id}`)
      const radius = Math.hypot(point.heliocentricAu.x, point.heliocentricAu.y, point.heliocentricAu.z)
      assert.ok(Math.abs(radius - bodyRadius) < 1e-9, `${secondary} ${id} keeps the orbit radius`)

      const dot =
        (body.x * point.heliocentricAu.x + body.y * point.heliocentricAu.y + body.z * point.heliocentricAu.z) /
        (bodyRadius * radius)
      const angleDeg = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI
      assert.ok(Math.abs(angleDeg - 60) < 0.5, `${secondary} ${id} separation was ${angleDeg}`)
    }
  }
})

test('collinear points are drawn at a fixed offset with a reported exaggeration', () => {
  const points = getLagrangePoints(NOW)
  const earthScene = { x: 0, y: 0, z: 0 }
  for (const id of ['L1', 'L2'] as const) {
    const point = points.find((candidate) => candidate.secondary === 'earth' && candidate.id === id)
    assert.ok(point)
    assert.equal(point.drawnOnSecondaryScale, true)
    const scene = getLagrangeScenePosition(point, NOW)
    const distance = Math.hypot(scene.x - earthScene.x, scene.y - earthScene.y, scene.z - earthScene.z)
    assert.ok(Math.abs(distance - LAGRANGE_COLLINEAR_SCENE_OFFSET) < 1e-6, `${id} scene offset`)
    assert.ok(getCollinearExaggeration(point, NOW) > 5, `${id} exaggeration must be reported`)
  }

  const l4 = points.find((candidate) => candidate.secondary === 'earth' && candidate.id === 'L4')
  assert.ok(l4)
  assert.equal(l4.drawnOnSecondaryScale, false)
  assert.equal(getCollinearExaggeration(l4, NOW), 1)
})

test('L1 and L2 sit on opposite sides of the Earth along the Sun line', () => {
  const points = getLagrangePoints(NOW)
  const l1 = getLagrangeScenePosition(points.find((p) => p.id === 'L1')!, NOW)
  const l2 = getLagrangeScenePosition(points.find((p) => p.id === 'L2')!, NOW)
  const dot = l1.x * l2.x + l1.y * l2.y + l1.z * l2.z
  assert.ok(dot < 0, 'the two collinear points must straddle the Earth')
})

test('Trojan camps are deterministic, Jupiter-only, and bounded', () => {
  const points = getLagrangePoints(NOW)
  const camp = points.find((candidate) => candidate.secondary === 'jupiter' && candidate.id === 'L4')!
  const first = sampleTrojanCloud(camp, NOW)
  const second = sampleTrojanCloud(camp, NOW)

  assert.equal(first.length, TROJAN_CLOUD_COUNT)
  assert.deepEqual(first, second)
  for (const sample of first) {
    assert.ok(Number.isFinite(sample.x) && Number.isFinite(sample.y) && Number.isFinite(sample.z))
  }

  const earthCamp = points.find((candidate) => candidate.secondary === 'earth' && candidate.id === 'L4')!
  assert.throws(() => sampleTrojanCloud(earthCamp, NOW), /modelled for Jupiter only/)
  assert.throws(() => sampleTrojanCloud(camp, NOW, 0), /positive integer/)
})

test('Lagrange geometry rejects an invalid time', () => {
  assert.throws(() => getLagrangePoints(Number.NaN), /Invalid Lagrange time/)
})
