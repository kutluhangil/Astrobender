import assert from 'node:assert/strict'
import test from 'node:test'
import {
  geomagneticScale,
  parseEonetEvents,
  parseEarthObservatoryCache,
  parseKpForecast,
  parseNoaaAurora,
  parseUsgsEarthquakes,
  parseXrayFlares,
  radioBlackoutScale,
} from '../src/lib/earth-observatory.ts'

test('EONET parser keeps the latest point geometry and source URL', () => {
  const events = parseEonetEvents({
    events: [{
      id: 'EONET_1',
      title: 'Wildfire',
      link: 'https://eonet.gsfc.nasa.gov/api/v3/events/EONET_1',
      categories: [{ title: 'Wildfires' }],
      geometry: [
        { date: '2026-07-25T00:00:00Z', coordinates: [28, 40] },
        { date: '2026-07-26T00:00:00Z', coordinates: [29, 41] },
      ],
    }],
  })
  assert.deepEqual(events[0], {
    id: 'eonet-EONET_1',
    kind: 'natural-event',
    title: 'Wildfire',
    subtitle: 'Wildfires',
    lat: 41,
    lon: 29,
    magnitude: null,
    occurredAt: '2026-07-26T00:00:00Z',
    sourceUrl: 'https://eonet.gsfc.nasa.gov/api/v3/events/EONET_1',
  })
})

test('USGS parser rejects invalid coordinates and preserves magnitude', () => {
  const events = parseUsgsEarthquakes({
    features: [
      {
        id: 'eq-1',
        properties: { title: 'M 5.2 test', mag: 5.2, time: 1785024000000, url: 'https://earthquake.usgs.gov/eq-1' },
        geometry: { coordinates: [35.4, 38.1, 10] },
      },
      {
        id: 'bad',
        properties: { title: 'bad', mag: null, time: null, url: '' },
        geometry: { coordinates: [999, 999] },
      },
    ],
  })
  assert.equal(events.length, 1)
  assert.equal(events[0].magnitude, 5.2)
  assert.equal(events[0].lat, 38.1)
  assert.equal(events[0].lon, 35.4)
})

test('NOAA aurora parser reports the strongest valid forecast cell', () => {
  const forecast = parseNoaaAurora({
    'Forecast Time': '2026-07-26T01:00:00Z',
    coordinates: [[20, 67, 18], [30, 70, 64], [400, 95, 100]],
  })
  assert.deepEqual(forecast, {
    forecastAt: '2026-07-26T01:00:00Z',
    maxProbability: 64,
    lat: 70,
    lon: 30,
    points: [
      { lat: 67, lon: 20, probability: 18 },
      { lat: 70, lon: 30, probability: 64 },
    ],
  })
})

test('Earth Observatory cache preserves source timestamps and rejects corrupt payloads', () => {
  const cache = parseEarthObservatoryCache(JSON.stringify({
    version: 1,
    sources: {
      aurora: {
        fetchedAt: 1785031200000,
        data: {
          forecastAt: '2026-07-26T01:00:00Z',
          maxProbability: 64,
          lat: 70,
          lon: 30,
          points: [{ lat: 70, lon: 30, probability: 64 }],
        },
      },
    },
  }))
  assert.equal(cache.sources.aurora?.fetchedAt, 1785031200000)
  assert.throws(
    () => parseEarthObservatoryCache('{"version":1,"sources":{"aurora":{"fetchedAt":"old"}}}'),
    /invalid aurora\.fetchedAt/,
  )
})

test('NOAA aurora longitudes on 0..359 east map onto -180..180 instead of being dropped', () => {
  const forecast = parseNoaaAurora({
    'Forecast Time': '2026-10-19T20:46:00Z',
    coordinates: [[260, 62, 40], [181, 65, 12], [10, 66, 5]],
  })
  assert.equal(forecast.maxProbability, 40)
  assert.equal(forecast.lon, -100)
  assert.deepEqual(forecast.points.map((point) => point.lon), [-100, -179])
})

test('NOAA Kp forecast yields the latest measured interval and the peak still ahead', () => {
  const outlook = parseKpForecast([
    { time_tag: '2026-10-19T18:00:00', kp: 3.33, observed: 'observed', noaa_scale: null },
    { time_tag: '2026-10-19T21:00:00', kp: 5.0, observed: 'estimated', noaa_scale: 'G1' },
    { time_tag: '2026-10-20T00:00:00', kp: 4.33, observed: 'predicted', noaa_scale: null },
    { time_tag: '2026-10-20T03:00:00', kp: 6.33, observed: 'predicted', noaa_scale: null },
    { time_tag: 'broken', kp: 9, observed: 'predicted', noaa_scale: 'G5' },
  ])
  assert.deepEqual(outlook.current, { at: '2026-10-19T21:00:00Z', kp: 5, status: 'estimated', scale: 'G1' })
  assert.deepEqual(outlook.peakForecast, { at: '2026-10-20T03:00:00Z', kp: 6.33, status: 'predicted', scale: 'G2' })
  assert.throws(() => parseKpForecast([{ time_tag: '2026-10-20T00:00:00', kp: 2, observed: 'predicted' }]), /no observed/)
  assert.throws(() => parseKpForecast({}), /not an array/)
})

test('GOES flare list reports the strongest flare with its NOAA radio-blackout level', () => {
  const summary = parseXrayFlares([
    { max_class: 'C1.0', max_time: '2026-10-12T23:53:00Z', max_xrlong: 1.04e-6 },
    { max_class: 'M1.6', max_time: '2026-10-19T09:03:00Z', max_xrlong: 1.68e-5 },
    { max_class: 'B6.2', max_time: '2026-10-19T22:10:00Z', max_xrlong: 6.2e-7 },
    { max_class: 'junk', max_time: '2026-10-19T22:10:00Z', max_xrlong: 1 },
  ])
  assert.equal(summary.count, 3)
  assert.equal(summary.strongest?.classLabel, 'M1.6')
  assert.equal(summary.strongest?.radioBlackout, 'R1')
  assert.equal(summary.latest?.classLabel, 'B6.2')
  assert.deepEqual(
    [1e-6, 1e-5, 5e-5, 1e-4, 1e-3, 2e-3].map(radioBlackoutScale),
    [null, 'R1', 'R2', 'R3', 'R4', 'R5'],
  )
  assert.deepEqual([4.33, 4.67, 5, 6, 7.33, 8, 9].map(geomagneticScale), [null, 'G1', 'G1', 'G2', 'G3', 'G4', 'G5'])
})

test('Earth Observatory cache round-trips space weather and rejects a corrupt Kp entry', () => {
  const kp = { current: { at: '2026-10-19T21:00:00Z', kp: 5, status: 'estimated', scale: 'G1' }, peakForecast: null }
  const flares = { strongest: null, latest: null, count: 0 }
  const cache = parseEarthObservatoryCache(JSON.stringify({
    version: 1,
    sources: { kp: { fetchedAt: 1, data: kp }, flares: { fetchedAt: 2, data: flares } },
  }))
  assert.deepEqual(cache.sources.kp?.data, kp)
  assert.deepEqual(cache.sources.flares?.data, flares)
  assert.throws(
    () => parseEarthObservatoryCache(JSON.stringify({ version: 1, sources: { kp: { fetchedAt: 1, data: { current: null } } } })),
    /invalid Kp data/,
  )
})
