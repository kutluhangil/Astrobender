import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { Body, GeoVector } from 'astronomy-engine'
import { parseOmmCsv } from '../src/lib/omm.ts'
import { compassPoint, isSunlit, predictPasses } from '../src/lib/satellite-passes.ts'

const ISS = parseOmmCsv(readFileSync(new URL('../public/data/gp-active.csv', import.meta.url), 'utf8'))
  .records.find((record) => record.norad === 25544)

test('the cylindrical shadow darkens only the anti-solar side within one Earth radius', () => {
  const when = new Date('2026-07-16T00:00:00Z')
  const sun = GeoVector(Body.Sun, when, true)
  const length = Math.hypot(sun.x, sun.y, sun.z)
  const toward = { x: (sun.x / length) * 6778, y: (sun.y / length) * 6778, z: (sun.z / length) * 6778 }
  assert.equal(isSunlit(toward, when), true)
  assert.equal(isSunlit({ x: -toward.x, y: -toward.y, z: -toward.z }, when), false)
  // Far behind Earth but well outside the shadow cylinder: still lit.
  const side = { x: -toward.x + 9000 * (sun.y / length), y: -toward.y - 9000 * (sun.x / length), z: -toward.z }
  assert.equal(isSunlit(side, when), true)
})

test('ISS passes over Istanbul rise and set at 10°, culminate higher, and recur each orbit', () => {
  assert.ok(ISS, 'ISS must be in the bundled snapshot')
  const passes = predictPasses(ISS, { latitude: 41.0082, longitude: 28.9784 }, { start: new Date(ISS.epochMs), hours: 48 })
  assert.ok(passes.length >= 6 && passes.length <= 16, `passes ${passes.length}`)
  for (const pass of passes) {
    const minutes = (pass.set.at.getTime() - pass.rise.at.getTime()) / 60_000
    assert.ok(minutes > 0.5 && minutes < 12, `pass lasted ${minutes} min`)
    assert.ok(pass.culmination.elevationDeg >= pass.rise.elevationDeg)
    assert.ok(pass.culmination.elevationDeg <= 90)
    if (pass.rise.at.getTime() > ISS.epochMs) assert.ok(Math.abs(pass.rise.elevationDeg - 10) < 0.2, `rise at ${pass.rise.elevationDeg}°`)
    assert.ok(Math.abs(pass.set.elevationDeg - 10) < 0.2, `set at ${pass.set.elevationDeg}°`)
    if (pass.visible) {
      assert.ok(pass.visibleFrom && pass.visibleTo && pass.visibleFrom <= pass.visibleTo)
    }
  }
  // Consecutive passes on one night are one orbit (~93 min) apart.
  const gaps = passes.slice(1).map((pass, index) => (pass.rise.at.getTime() - passes[index].rise.at.getTime()) / 60_000)
  assert.ok(gaps.some((gap) => gap > 85 && gap < 105), `gaps ${gaps.map((gap) => gap.toFixed(0)).join(',')}`)
  // Mid-July evenings at 41° N have visible ISS passes.
  assert.ok(passes.some((pass) => pass.visible))
})

test('pass prediction rejects impossible observers and windows', () => {
  assert.ok(ISS)
  assert.throws(() => predictPasses(ISS, { latitude: 91, longitude: 0 }, { start: new Date(), hours: 1 }), /latitude/)
  assert.throws(() => predictPasses(ISS, { latitude: 0, longitude: 0 }, { start: new Date(), hours: 0 }), /positive/)
  assert.equal(compassPoint(0, 'tr'), 'K')
  assert.equal(compassPoint(202.5, 'en'), 'SSW')
})
