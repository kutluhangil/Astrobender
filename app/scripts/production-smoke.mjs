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
if (payload.status !== 'ok' || payload.service !== 'astrobender') {
  throw new Error(`${baseUrl}/api/health returned an invalid health payload`)
}

const tle = await request('/api/tle?feed=active', 'text/plain')
const tleText = await tle.text()
if (!/(^|\n)1 \d{5}/.test(tleText) || !/(^|\n)2 \d{5}/.test(tleText)) {
  throw new Error(`${baseUrl}/api/tle?feed=active did not return valid TLE lines`)
}

console.log(`Production smoke passed for ${baseUrl}: app shell, health, and TLE proxy are available.`)
