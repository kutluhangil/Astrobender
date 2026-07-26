import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseEonetEvents,
  parseNoaaAurora,
  parseUsgsEarthquakes,
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
  })
})
