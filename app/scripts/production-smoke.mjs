const baseUrl = (process.env.ASTROBENDER_BASE_URL ?? 'https://astrobender.vercel.app').replace(/\/$/, '')
const timeoutMs = 15_000

async function request(path, expectedContentType) {
  const url = `${baseUrl}${path}`
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(timeoutMs),
  })
  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok) {
    const location = response.headers.get('location')
    throw new Error(`${url} returned HTTP ${response.status}${location ? ` → ${location}` : ''}`)
  }
  if (!contentType.includes(expectedContentType)) {
    throw new Error(`${url} returned unexpected content-type: ${contentType || 'missing'}`)
  }
  return response
}

const page = await request('/', 'text/html')
const html = await page.text()
if (!html.includes('id="root"')) {
  throw new Error(`${baseUrl}/ did not return the ASTROBENDER application shell`)
}

const health = await request('/api/health', 'application/json')
const payload = await health.json()
if (!['ok', 'degraded'].includes(payload.status) || payload.service !== 'astrobender') {
  throw new Error(`${baseUrl}/api/health returned an invalid health payload: ${JSON.stringify(payload).slice(0, 300)}`)
}
if (payload.status === 'degraded') {
  console.warn(`Upstream degradation reported by ${baseUrl}/api/health: ${JSON.stringify(payload.upstreams)}`)
}

const gp = await request('/api/tle?feed=active', 'text/csv')
const gpText = await gp.text()
const [header, ...rows] = gpText.trim().split('\n')
for (const column of ['OBJECT_NAME', 'NORAD_CAT_ID', 'EPOCH', 'MEAN_MOTION', 'BSTAR']) {
  if (!header.split(',').includes(column)) {
    throw new Error(`${baseUrl}/api/tle?feed=active returned an OMM CSV header without ${column}: ${header.slice(0, 180)}`)
  }
}
if (rows.length < 1000) {
  throw new Error(`${baseUrl}/api/tle?feed=active returned only ${rows.length} element sets`)
}

console.log(
  `Production smoke passed for ${baseUrl}: app shell, health, and GP proxy (${rows.length} element sets) are available.`,
)
