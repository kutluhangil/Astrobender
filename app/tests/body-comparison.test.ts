import assert from 'node:assert/strict'
import test from 'node:test'
import {
  EARTH_RADIUS_KM,
  bodyRadiusKm,
  earthRadiusRatio,
  getSignatureMetrics,
} from '../src/lib/body-comparison.ts'
import { getAllBodyIds } from '../src/lib/planets.ts'

test('every catalogued body yields a positive radius parsed from its own fact string', () => {
  for (const bodyId of getAllBodyIds()) {
    const radiusKm = bodyRadiusKm(bodyId)
    assert.ok(radiusKm > 0, `${bodyId} radius`)
    assert.ok(Number.isFinite(radiusKm), `${bodyId} radius is finite`)
  }
  assert.equal(bodyRadiusKm('earth'), EARTH_RADIUS_KM)
  assert.equal(earthRadiusRatio('earth'), 1)
  assert.ok(Math.abs(earthRadiusRatio('mars') - 0.532) < 0.01)
  assert.ok(earthRadiusRatio('jupiter') > 10)
})

test('the signature row stays at exactly three metrics for every body', () => {
  for (const bodyId of getAllBodyIds()) {
    const metrics = getSignatureMetrics(bodyId, 'tr')
    assert.equal(metrics.length, 3, `${bodyId} metric count`)
    assert.deepEqual(metrics.map((metric) => metric.key), ['radius', 'distance', 'moons'])
    for (const metric of metrics) {
      assert.ok(metric.label.length > 0, `${bodyId} ${metric.key} label`)
      assert.ok(metric.value.length > 0, `${bodyId} ${metric.key} value`)
    }
  }
})

test('comparisons are stated against Earth and localized', () => {
  const [radiusTr, distanceTr] = getSignatureMetrics('mars', 'tr')
  assert.match(radiusTr.comparison ?? '', /Dünya'nın 0,53 katı/)
  assert.match(distanceTr.comparison ?? '', /Dünya-Güneş uzaklığının 1,5 katı/)

  const [radiusEn] = getSignatureMetrics('mars', 'en')
  assert.match(radiusEn.comparison ?? '', /0\.53× Earth/)

  const [earthRadius] = getSignatureMetrics('earth', 'tr')
  assert.equal(earthRadius.comparison, null)
})

test('moons report both the known total and how many are modelled', () => {
  const [, , jupiterMoons] = getSignatureMetrics('jupiter', 'tr')
  assert.equal(jupiterMoons.value, '101')
  assert.match(jupiterMoons.comparison ?? '', /^10 tanesi modelli$/)

  const [, , vestaMoons] = getSignatureMetrics('vesta', 'tr')
  assert.equal(vestaMoons.value, '0')
  assert.match(vestaMoons.comparison ?? '', /Hiçbiri modellenmedi/)
})

test('a body whose radius cannot be read raises instead of comparing wrongly', () => {
  assert.throws(
    // @ts-expect-error deliberately probing an unknown body id
    () => bodyRadiusKm('nibiru'),
    /No catalogued radius for body: nibiru/,
  )
})
