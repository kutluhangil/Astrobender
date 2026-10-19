import assert from 'node:assert/strict'
import test from 'node:test'
import { UI_GROUPS, mergeFeeds } from '../src/lib/satellites.ts'

const line1 = (norad: number) =>
  `1 ${String(norad).padStart(5, '0')}U 98067A   26199.26509818  .00016717  00000-0  10270-3 0  9005`
const line2 = (norad: number) =>
  `2 ${String(norad).padStart(5, '0')}  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537`

function feed(names: string[]): string {
  return names.map((name, index) => `${name}\n${line1(10000 + index)}\n${line2(10000 + index)}`).join('\n')
}

function groupOf(name: string): string {
  const [sat] = mergeFeeds({
    active: feed([name]),
    visual: null,
    cosmos2251: null,
    iridium33: null,
    fengyun1c: null,
  })
  return UI_GROUPS[sat.group].key
}

test('station layer matches station names, not every name containing "ISS"', () => {
  assert.equal(groupOf('ISS (ZARYA)'), 'stations')
  assert.equal(groupOf('CSS (TIANHE)'), 'stations')
  assert.equal(groupOf('AISSAT 4'), 'other')
  assert.equal(groupOf('SWISSCUBE'), 'other')
  assert.equal(groupOf('OUTPOST MISSION 2'), 'other')
})

test('ISRO GSAT and ARSAT communications satellites are not Galileo or weather', () => {
  assert.equal(groupOf('GSAT0101 (GALILEO-PFM)'), 'galileo')
  assert.equal(groupOf('GSAT-30'), 'other')
  assert.equal(groupOf('ARSAT 2'), 'other')
  assert.equal(groupOf('METEOSAT-11'), 'weather')
})
