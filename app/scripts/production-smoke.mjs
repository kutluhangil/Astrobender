import { fileURLToPath } from 'node:url'

const baseUrl = (process.env.ASTROBENDER_BASE_URL ?? 'https://astrobender.vercel.app').replace(/\/$/, '')
const timeoutMs = 15_000
const JPL_REQUIRED_FIELDS = ['des', 'cd', 'dist', 'v_rel']

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function assertJplCadPayload(payload) {
  if (!isRecord(payload) || !Array.isArray(payload.fields) || !Array.isArray(payload.data)) {
    throw new Error('JPL CAD payload must contain fields and data arrays')
  }
  const fields = payload.fields.map(String)
  const missing = JPL_REQUIRED_FIELDS.filter((field) => !fields.includes(field))
  if (missing.length > 0) {
    throw new Error(`JPL CAD payload is missing required fields: ${missing.join(', ')}`)
  }
}

function assertHealthyDependency(name, report) {
  if (
    !isRecord(report) ||
    report.status !== 'ok' ||
    !Number.isFinite(Date.parse(report.checkedAt)) ||
    !Number.isFinite(report.durationMs) ||
    report.durationMs < 0 ||
    !Number.isInteger(report.httpStatus) ||
    report.httpStatus < 200 ||
    report.httpStatus >= 300 ||
    report.error !== null
  ) {
    throw new Error(`Production readiness returned an invalid ${name} readiness report`)
  }
}

export function assertReadinessPayload(payload) {
  if (!isRecord(payload) || !isRecord(payload.dependencies)) {
    throw new Error('Production readiness payload is missing dependency diagnostics')
  }
  assertHealthyDependency('tleProxy', payload.dependencies.tleProxy)
  assertHealthyDependency('jplCadProxy', payload.dependencies.jplCadProxy)
  if (payload.status !== 'ready') {
    throw new Error(`Production readiness status is ${String(payload.status)}`)
  }
}

export function assertServiceWorkerSource(source) {
  const hasShellCache = source.includes('astrobender-shell-')
  const hasInstallHandler = /addEventListener\(["']install["']/.test(source)
  const hasInjectedRevision = /["']revision["']\s*:\s*(?:null|["'][0-9a-f]{8,}["'])/i.test(source)
  if (!hasShellCache || !hasInstallHandler || !hasInjectedRevision) {
    throw new Error('Service worker does not expose the custom app-shell precache contract')
  }
}

async function request(path, expectedContentType, expectedStatuses = [200]) {
  const url = `${baseUrl}${path}`
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(timeoutMs),
  })
  const contentType = response.headers.get('content-type') ?? ''
  if (!expectedStatuses.includes(response.status)) {
    const location = response.headers.get('location')
    throw new Error(`${url} returned HTTP ${response.status}${location ? ` → ${location}` : ''}`)
  }
  if (!contentType.includes(expectedContentType)) {
    throw new Error(`${url} returned unexpected content-type: ${contentType || 'missing'}`)
  }
  return response
}

export async function runProductionSmoke() {
  const page = await request('/', 'text/html')
  const html = await page.text()
  if (!html.includes('id="root"')) {
    throw new Error(`${baseUrl}/ did not return the ASTROBENDER application shell`)
  }

  const health = await request('/api/health', 'application/json')
  const payload = await health.json()
  if (payload.status !== 'ok' || payload.service !== 'astrobender' || !/^(local|[0-9a-f]{7,64})$/i.test(payload.revision ?? '')) {
    throw new Error(`${baseUrl}/api/health returned an invalid health payload`)
  }

  const readiness = await request('/api/health?mode=ready', 'application/json', [200, 503])
  const readinessPayload = await readiness.json()
  assertReadinessPayload(readinessPayload)

  const tle = await request('/api/tle?feed=active', 'text/plain')
  const tleText = await tle.text()
  if (!/(^|\n)1 \d{5}/.test(tleText) || !/(^|\n)2 \d{5}/.test(tleText)) {
    throw new Error(`${baseUrl}/api/tle?feed=active did not return valid TLE lines`)
  }

  const jpl = await request('/api/jpl-cad', 'application/json')
  const jplPayload = await jpl.json()
  assertJplCadPayload(jplPayload)

  for (const [header, expected] of [
    ['content-security-policy', "default-src 'self'"],
    ['permissions-policy', 'geolocation=(self)'],
    ['x-content-type-options', 'nosniff'],
  ]) {
    const value = page.headers.get(header) ?? ''
    if (!value.includes(expected)) {
      throw new Error(`${baseUrl}/ is missing required ${header}: ${expected}`)
    }
  }

  const manifest = await request('/manifest.webmanifest', 'json')
  const manifestPayload = await manifest.json()
  if (manifestPayload.name !== 'ASTROBENDER' || !Array.isArray(manifestPayload.icons)) {
    throw new Error(`${baseUrl}/manifest.webmanifest returned an invalid PWA manifest`)
  }

  const serviceWorker = await request('/sw.js', 'javascript')
  assertServiceWorkerSource(await serviceWorker.text())

  console.log(`Production smoke passed for ${baseUrl}: shell, liveness, readiness, JPL, TLE, security headers, manifest, and service worker are available.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runProductionSmoke()
}
