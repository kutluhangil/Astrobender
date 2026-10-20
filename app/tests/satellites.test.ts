import assert from 'node:assert/strict'
import test from 'node:test'
import { OMM_CSV_COLUMNS } from '../src/lib/omm.ts'
import { UI_GROUPS, countGpRows, isValidGpCsv, mergeFeeds, mergeFeedsWithReport } from '../src/lib/satellites.ts'

const HEADER = OMM_CSV_COLUMNS.join(',')

function feed(names: string[], firstNorad = 10000): string {
  const rows = names.map((name, index) =>
    `${name.includes(',') ? `"${name}"` : name},2000-001A,${firstNorad + index},2026-07-18T06:21:44.482752,15.5,0.0006,51.6,247.4,130.5,325,0.0001,0.0001,0`,
  )
  return `${HEADER}\n${rows.join('\n')}\n`
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

test('feeds merge by catalog number above 99999 and the visual feed wins the layer', () => {
  const sats = mergeFeeds({
    active: feed(['STARLINK-40001', 'NEW SAT'], 100000),
    visual: feed(['NEW SAT'], 100001),
    cosmos2251: feed(['COSMOS 2251 DEB'], 100000),
    iridium33: null,
    fengyun1c: null,
  })
  assert.equal(sats.length, 2)
  const byNorad = new Map(sats.map((sat) => [sat.norad, UI_GROUPS[sat.group].key]))
  assert.equal(byNorad.get(100000), 'debris-cosmos')
  assert.equal(byNorad.get(100001), 'brightest')
  assert.equal(sats[0].elements.norad, sats[0].norad)
})

test('GP CSV validation needs the exact SGP4 columns and a data row', () => {
  assert.equal(isValidGpCsv(feed(['ISS (ZARYA)'])), true)
  assert.equal(isValidGpCsv(`${HEADER}\n`), false)
  assert.equal(isValidGpCsv(HEADER.replace('MEAN_MOTION,', 'MEAN_MOTION_X,') + '\nrow\n'), false)
  assert.equal(isValidGpCsv('1 25544U 98067A\n2 25544\n'), false)
  assert.equal(isValidGpCsv(null), false)
})

test('merging reports malformed rows per feed instead of dropping them silently', () => {
  const broken = `${HEADER}\nGOOD,2000-001A,20000,2026-07-18T06:21:44,15.5,0.0006,51.6,247.4,130.5,325,0.0001,0.0001,0\nBAD,2000-001B,20001,2026-07-18T06:21:44,x,0.0006,51.6,247.4,130.5,325,0.0001,0.0001,0\n`
  const report = mergeFeedsWithReport({ active: feed(['ISS (ZARYA)']), visual: null, cosmos2251: broken, iridium33: null, fengyun1c: null })
  assert.deepEqual(report.skipped, { cosmos2251: 1 })
  assert.equal(report.sats.length, 2)
  assert.equal(countGpRows(broken), 2)
  assert.equal(countGpRows(`${HEADER}\n`), 0)
})
