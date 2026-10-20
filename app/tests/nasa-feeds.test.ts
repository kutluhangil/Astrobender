import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/nasa-feed.ts'
import {
  flareClassRank,
  parseApod,
  parseCoronalMassEjections,
  parseEpic,
  parseExoplanetCount,
  parseExoplanets,
  parseFireballs,
  parseGeomagneticStorms,
  parseHorizonsRange,
  parseScout,
  parseSentry,
  parseSolarFlares,
  stormScale,
} from '../src/lib/nasa-feeds.ts'
import { ECLIPSES, upcomingEclipses } from '../src/lib/eclipses.ts'

test('solar flares sort newest first and rank GOES classes', () => {
  const flares = parseSolarFlares([
    { flrID: 'a', beginTime: '2026-10-01T01:00Z', classType: 'M1.2', sourceLocation: 'N10E20' },
    { flrID: 'b', beginTime: '2026-10-03T01:00Z', classType: 'C5.0' },
  ])
  assert.deepEqual(flares.map((flare) => flare.id), ['b', 'a'])
  assert.ok(flareClassRank('X1.0') > flareClassRank('M9.9'))
  assert.ok(flareClassRank('M1.0') > flareClassRank('C9.9'))
  assert.equal(flareClassRank('?'), -1)
})

test('CME parser prefers the most accurate analysis and tolerates none', () => {
  const [withAnalysis, without] = parseCoronalMassEjections([
    {
      activityID: 'x', startTime: '2026-10-02T00:00Z',
      cmeAnalyses: [
        { speed: 300, isMostAccurate: false },
        { speed: 750, halfAngle: 40, type: 'C', isMostAccurate: true },
      ],
    },
    { activityID: 'y', startTime: '2026-10-01T00:00Z', cmeAnalyses: null },
  ])
  assert.equal(withAnalysis.speedKmS, 750)
  assert.equal(without.speedKmS, null)
})

test('geomagnetic storm reports max Kp and NOAA scale', () => {
  const [storm] = parseGeomagneticStorms([
    { gstID: 'g', startTime: '2026-09-01T00:00Z', allKpIndex: [{ kpIndex: 4 }, { kpIndex: 7 }] },
  ])
  assert.equal(storm.maxKp, 7)
  assert.equal(stormScale(storm.maxKp), 'G3')
  assert.equal(stormScale(4), '—')
  assert.equal(stormScale(9), 'G5')
})

test('Sentry table ranks by cumulative Palermo scale', () => {
  const table = parseSentry({
    count: '2',
    data: [
      { des: 'A', fullname: '(A)', ip: '1e-6', ps_cum: '-5.1', ts_max: '0', n_imp: 1, range: '2050-2050', diameter: '0.1', h: '22' },
      { des: 'B', fullname: '(B)', ip: '1e-3', ps_cum: '-2.0', ts_max: null, n_imp: 3, range: '2060-2070', diameter: null, h: '20' },
    ],
  })
  assert.equal(table.total, 2)
  assert.equal(table.objects[0].designation, 'B')
  assert.equal(table.objects[0].torinoMax, null)
  assert.equal(table.objects[1].diameterKm, 0.1)
})

test('Scout parser ranks by NEO score', () => {
  const objects = parseScout({
    data: [
      { objectName: 'low', neoScore: 10 },
      { objectName: 'high', neoScore: 99, phaScore: 5, Vmag: '21.5', caDist: '3.2', vInf: '12' },
    ],
  })
  assert.equal(objects[0].name, 'high')
  assert.equal(objects[0].closestApproachLd, 3.2)
})

test('fireball parser signs coordinates and keeps missing values null', () => {
  const [fireball] = parseFireballs({
    fields: ['date', 'energy', 'impact-e', 'lat', 'lat-dir', 'lon', 'lon-dir', 'alt', 'vel'],
    data: [['2026-10-04 03:14:45', '5.4', '0.18', '41.8', 'S', '173.1', 'W', '26.9', null]],
  })
  assert.equal(fireball.latitude, -41.8)
  assert.equal(fireball.longitude, -173.1)
  assert.equal(fireball.velocityKmS, null)
  assert.throws(() => parseFireballs({ fields: ['date'], data: [] }), /field "energy" missing/)
})

test('APOD and EPIC parsers build checked URLs', () => {
  const apod = parseApod({ date: '2026-10-20', title: 'T', explanation: ' a  b ', url: 'https://apod.nasa.gov/x.jpg', media_type: 'image' })
  assert.equal(apod.explanation, 'a b')
  const [epic] = parseEpic([
    { identifier: '1', date: '2026-10-18 01:04:36', image: 'epic_1b_20261018010436', centroid_coordinates: { lat: 1, lon: 2 } },
  ])
  assert.equal(
    epic.imageUrl,
    'https://epic.gsfc.nasa.gov/archive/natural/2026/10/18/jpg/epic_1b_20261018010436.jpg',
  )
  assert.throws(() => parseEpic([{ identifier: '1', date: 'bad', image: 'i', centroid_coordinates: { lat: 1, lon: 2 } }]), /unreadable date/)
})

test('Horizons parser reads range, speed and one-way light time', () => {
  const range = parseHorizonsRange({
    result: 'header\n$$SOE\n 2026-Oct-20 00:00      172.0926268299  16.8816235  172.612344080431  35.4318053\n$$EOE\nfooter',
  })
  assert.equal(range.heliocentricAu, 172.0926268299)
  assert.ok(Math.abs(range.lightTimeHours - 23.9) < 0.1, `light time ${range.lightTimeHours}`)
  assert.throws(() => parseHorizonsRange({ result: 'No ephemeris for target' }), /no ephemeris table/)
})

test('exoplanet parsers validate the archive columns', () => {
  const [planet] = parseExoplanets([
    { pl_name: 'P b', hostname: 'P', disc_year: 2026, discoverymethod: 'Transit', pl_rade: 1.5, pl_orbper: null, sy_dist: '12.3' },
  ])
  assert.equal(planet.distanceParsec, 12.3)
  assert.equal(planet.periodDays, null)
  assert.equal(parseExoplanetCount([{ confirmed: 6123 }]), 6123)
  assert.throws(() => parseExoplanets([{ pl_name: 'x' }]), /hostname/)
})

test('eclipse table is chronological per kind and filters to the future', () => {
  for (const kind of ['solar', 'lunar'] as const) {
    const dates = ECLIPSES.filter((eclipse) => eclipse.kind === kind).map((eclipse) => eclipse.date)
    assert.deepEqual(dates, [...dates].sort())
  }
  const upcoming = upcomingEclipses(Date.UTC(2027, 7, 3))
  assert.ok(upcoming.every((eclipse) => eclipse.date >= '2027-08-03'))
  assert.equal(upcoming[0].date, '2027-08-17')
})

function createResponse() {
  const headers = new Map<string, string>()
  let statusCode = 0
  let body: unknown
  return {
    response: {
      setHeader(name: string, value: string) { headers.set(name, value) },
      status(code: number) { statusCode = code; return this },
      json(value: unknown) { body = value },
    },
    result: () => ({ headers, statusCode, body: body as { error?: string } }),
  }
}

test('nasa-feed rejects unknown feeds, extra parameters and non-GET without fetching', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('must not fetch') }
  try {
    for (const [method, url, status] of [
      ['GET', '/api/nasa-feed?feed=nope', 400],
      ['GET', '/api/nasa-feed?feed=sentry&x=1', 400],
      ['GET', '/api/nasa-feed', 400],
      ['GET', '/api/nasa-feed?feed=__proto__', 400],
      ['POST', '/api/nasa-feed?feed=sentry', 405],
    ] as const) {
      const { response, result } = createResponse()
      await handler({ method, url }, response)
      assert.equal(result().statusCode, status, `${method} ${url}`)
    }
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('nasa-feed builds a fixed upstream URL, caches it, and reports upstream failures with status and body', async () => {
  const originalFetch = globalThis.fetch
  const requested: string[] = []
  let ok = true
  globalThis.fetch = async (input) => {
    requested.push(String(input))
    return ok
      ? new Response(JSON.stringify({ data: [] }), { status: 200 })
      : new Response('upstream says no', { status: 503, statusText: 'Service Unavailable' })
  }
  try {
    const good = createResponse()
    await handler({ method: 'GET', url: '/api/nasa-feed?feed=sentry' }, good.response)
    assert.equal(good.result().statusCode, 200)
    assert.equal(requested[0], 'https://ssd-api.jpl.nasa.gov/sentry.api')
    assert.match(good.result().headers.get('Cache-Control') ?? '', /s-maxage=3600/)

    ok = false
    const bad = createResponse()
    await handler({ method: 'GET', url: '/api/nasa-feed?feed=donki-flares' }, bad.response)
    assert.equal(bad.result().statusCode, 502)
    assert.match(bad.result().body.error ?? '', /HTTP 503 Service Unavailable — upstream says no/)
    assert.match(requested[1], /^https:\/\/ccmc\.gsfc\.nasa\.gov\/DONKI\/WS\/get\/FLR\?startDate=\d{4}-\d{2}-\d{2}&endDate=/)
  } finally {
    globalThis.fetch = originalFetch
  }
})
