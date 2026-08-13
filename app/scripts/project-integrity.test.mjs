import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('..', import.meta.url))
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))
const read = (path) => readFileSync(new URL(path, `${new URL('..', import.meta.url)}/`), 'utf8')
const readRepository = (path) => readFileSync(new URL(path, `${new URL('../../', import.meta.url)}/`), 'utf8')

test('root Vercel configuration builds the nested app and exposes a standalone JPL CAD function', () => {
  const vercel = JSON.parse(readRepository('vercel.json'))
  assert.equal(vercel.installCommand, 'npm --prefix app ci')
  assert.equal(vercel.buildCommand, 'npm --prefix app run build')
  assert.equal(vercel.outputDirectory, 'app/dist')
  assert.equal(existsSync(`${repositoryRoot}/api/jpl-cad.ts`), true)
  assert.equal(existsSync(`${repositoryRoot}/api/health.ts`), true)
  assert.match(readRepository('api/jpl-cad.ts'), /createJplCadHandler/)
  assert.doesNotMatch(readRepository('api/jpl-cad.ts'), /export \{ default \} from/)
})

test('production smoke target checks live adapters, readiness, security, PWA artifacts, and revision shape', () => {
  const smoke = read('scripts/production-smoke.mjs')
  const workflow = readRepository('.github/workflows/production-smoke.yml')
  assert.match(smoke, /\/api\/health/)
  assert.match(smoke, /mode=ready/)
  assert.match(smoke, /\/api\/tle\?feed=active/)
  assert.match(smoke, /\/api\/jpl-cad/)
  assert.match(smoke, /manifest\.webmanifest/)
  assert.match(smoke, /\/sw\.js/)
  assert.match(smoke, /permissions-policy/)
  assert.match(smoke, /revision/)
  assert.match(workflow, /workflow_dispatch/)
  assert.match(workflow, /npm run smoke:production/)
})

test('runtime and CI use the pinned Node release and split browser quality gates', () => {
  const packageJson = JSON.parse(read('package.json'))
  const workflow = readRepository('.github/workflows/quality.yml')
  const playwright = read('playwright.config.ts')

  assert.match(readRepository('.nvmrc'), /^24\.15\.0\s*$/)
  assert.equal(packageJson.engines.node, '>=24.15.0 <25')
  assert.equal(packageJson.engines.npm, '>=11')
  assert.match(packageJson.scripts['verify:ci'], /test:e2e:chromium/)
  assert.match(packageJson.scripts['verify:ci'], /test:e2e:pwa/)
  assert.equal(packageJson.scripts['audit:production'], 'npm audit --omit=dev --audit-level=high')
  assert.match(packageJson.scripts['verify:ci'], /audit:production/)
  assert.match(workflow, /npm run verify:ci/)
  assert.match(workflow, /npx playwright install --with-deps chromium/)
  assert.match(playwright, /--strictPort/)
})

test('offline feedback accurately describes the media-free app shell', () => {
  const control = read('src/components/hud/PrepareOfflineControl.tsx')
  const worker = read('src/sw.ts')

  assert.match(control, /Çevrimdışı uygulama kabuğunu doğrula/)
  assert.match(control, /Şematik görseller kod içinde üretilir/)
  assert.match(worker, /APP_SHELL_CACHE/)
  assert.doesNotMatch(worker, /PREPARE_OFFLINE_TEXTURES/)
  assert.doesNotMatch(worker, /\/textures\//)
  assert.doesNotMatch(worker, /\/audio\//)
})

test('source governance validates every evidence group through the scheduled check', () => {
  const catalog = read('src/lib/celestial-catalog.ts')
  const workflow = readRepository('.github/workflows/source-review.yml')
  const result = spawnSync(process.execPath, ['scripts/check-source-freshness.mjs'], {
    cwd: appRoot,
    encoding: 'utf8',
  })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Evidence source reviews are current: \d+ groups checked/)
  assert.doesNotMatch(catalog, /CATALOG_VERIFIED_AT/)
  assert.match(workflow, /schedule:/)
  assert.match(workflow, /npm run check:sources/)
})

test('ASTROBENDER is the only product name in the application source', () => {
  const fallback = read('src/components/FallbackTable.tsx')
  assert.doesNotMatch(fallback, new RegExp(['ORBIT', 'VEIL'].join(' '), 'i'))
  assert.match(fallback, />STROBENDER/)
})

test('document language and font policy are self-contained', () => {
  const html = read('index.html')
  assert.match(html, /<html lang="tr">/)
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/)
  assert.match(html, /rel="canonical" href="https:\/\/astrobender\.vercel\.app\//)
  assert.match(html, /property="og:title"/)
})

test('asset attribution registry exactly covers and verifies runtime media files', () => {
  const result = spawnSync(process.execPath, ['scripts/check-asset-attributions.mjs'], {
    cwd: appRoot,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /exactly covers \d+ runtime media files/)
  assert.match(result.stdout, /complete provenance/)
  assert.doesNotMatch(result.stdout, /incomplete provenance/)
})

test('production responses include baseline security headers', () => {
  // The repository-root vercel.json is the only deployed config; a nested
  // app/vercel.json would be silently ignored and drift out of sync.
  assert.equal(existsSync(`${appRoot}/vercel.json`), false)
  const vercel = readRepository('vercel.json')
  for (const header of [
    'Content-Security-Policy',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Permissions-Policy',
    'X-Frame-Options',
  ]) {
    assert.match(vercel, new RegExp(header))
  }
  assert.match(vercel, /geolocation=\(self\)/)
})

test('unused vulnerable template dependencies are absent', () => {
  const pkg = JSON.parse(read('package.json'))
  assert.equal(pkg.dependencies['react-router'], undefined)
  assert.equal(pkg.dependencies.recharts, undefined)
})

test('current moon counts and Neptune wind units are correct', () => {
  const facts = read('src/lib/celestial-facts.ts')
  const scaleModal = read('src/components/hud/ScaleSandboxModal.tsx')

  assert.match(facts, /101 Bilinen Uydu/)
  assert.match(facts, /274 Bilinen Uydu/)
  assert.match(facts, /29 Bilinen Uydu/)
  assert.match(facts, /new-moon-discovered-orbiting-uranus/)
  assert.match(read('src/lib/planets.ts'), /knownMoonCount: 29/)
  assert.doesNotMatch(scaleModal, /2,100 km\/s/)
  assert.match(scaleModal, /2,000 km\/h/)
})

test('dialogs expose modal semantics', () => {
  for (const path of [
    'src/components/hud/ScaleSandboxModal.tsx',
    'src/components/hud/LandingSiteModal.tsx',
  ]) {
    const source = read(path)
    assert.match(source, /role="dialog"/, path)
    assert.match(source, /aria-modal="true"/, path)
  }
})

test('method, source, and privacy disclosures are available from the HUD', () => {
  const modal = read('src/components/hud/AboutAstrobenderModal.tsx')
  const home = read('src/pages/Home.tsx')

  assert.match(modal, /role="dialog"/)
  assert.match(modal, /aria-modal="true"/)
  assert.match(modal, /CelesTrak/)
  assert.match(modal, /no accounts, ad networks, or behavioral analytics/)
  assert.match(home, /showAboutModal/)
})

test('procedural surfaces are explicit opt-in and never claim untraceable imagery', () => {
  const engine = read('src/lib/globe-engine.ts')
  const planets = read('src/lib/planets.ts')
  const home = read('src/pages/Home.tsx')
  const layers = read('src/components/hud/LayerPanel.tsx')
  const schematicSurfaces = read('src/lib/schematic-surfaces.ts')

  assert.match(schematicSurfaces, /DEFAULT_SCHEMATIC_SURFACES_VISIBLE = false/)
  assert.match(engine, /createSchematicSurfaceTexture/)
  assert.match(engine, /setSchematicSurfacesVisible\(visible: boolean\)/)
  assert.match(home, /useState\([\s\S]*?DEFAULT_SCHEMATIC_SURFACES_VISIBLE/)
  assert.match(home, /engineRef\.current\?\.setSchematicSurfacesVisible\(next\)/)
  assert.match(home, /schematicActive: schematicSurfacesVisible \|\| asteroidsVisible \|\| meteorFlowVisible/)
  assert.match(layers, /onToggleSchematicSurfaces/)
  assert.match(layers, /Şematik yüzey görselleri/)
  assert.doesNotMatch(engine, /TextureLoader/)
  assert.doesNotMatch(planets, /texture:/)
})

test('celestial pointer selection flies the engine to the selected body', () => {
  const home = read('src/pages/Home.tsx')
  assert.match(home, /onSelectBody: \(body\) => \{[\s\S]*?engine\.setFocusTarget\(body\)/)
})

test('cinematic tour is a fixed-duration visual sequence without narration media', () => {
  const home = read('src/pages/Home.tsx')
  const tour = read('src/lib/cinematic-tour.ts')
  assert.match(home, /engine\.startCinematicTour\(CINEMATIC_TOUR_SCRIPT_DURATION_S\)/)
  assert.doesNotMatch(home, /new Audio\(/)
  assert.doesNotMatch(tour, /CINEMATIC_TOUR_AUDIO_PATHS/)
  assert.match(tour, /CINEMATIC_TOUR_SCRIPT_DURATION_S = 273/)
})

test('light-space theme and off-body target callout are wired', () => {
  const home = read('src/pages/Home.tsx')
  const engine = read('src/lib/globe-engine.ts')
  const callout = read('src/components/hud/TargetBodyCallout.tsx')

  assert.match(home, /data-space-theme=\{theme\}/)
  assert.match(home, /TargetBodyCallout/)
  assert.match(engine, /getBodyScreenAnchor/)
  assert.match(engine, /0xe8f1f6/)
  assert.match(callout, /TARGET LOCK/)
  assert.match(callout, /decodeName/)
})

test('recoverable operational warnings stay in the time-controller information port', () => {
  const home = read('src/pages/Home.tsx')
  const timeController = read('src/components/hud/TimeController.tsx')

  assert.match(home, /const systemNotices: SystemStatusNotice\[\]/)
  assert.match(home, /<TimeController[\s\S]*?clock=\{clock\}[\s\S]*?notices=\{systemNotices\}/)
  assert.doesNotMatch(home, /tleWarningDismissed/)
  assert.match(timeController, /aria-controls="system-status-panel"/)
  assert.match(timeController, /notices\.map/)
  assert.match(timeController, /technicalDetails/)
})

test('the temporary ASTROBENDER transmission animates over the opening 3D globe', () => {
  const home = read('src/pages/Home.tsx')
  const wordmark = read('src/components/OpeningWordmark.tsx')
  const styles = read('src/index.css')

  assert.match(home, /OpeningWordmark/)
  assert.match(home, /status !== 'loading'[\s\S]*?<OpeningWordmark/)
  assert.match(wordmark, /SCRAMBLE_DURATION_MS = 1100/)
  assert.match(wordmark, /VISIBLE_DURATION_MS = 3600/)
  assert.match(wordmark, /EXOLINK_Ω7F2A/)
  assert.match(wordmark, /prefers-reduced-motion/)
  assert.match(styles, /\.opening-wordmark/)
  assert.match(styles, /\.opening-wordmark--leaving/)
  assert.doesNotMatch(styles, /\.intro-splash/)
})

test('untraceable runtime-media directories are absent', () => {
  assert.equal(existsSync(`${appRoot}/public/textures`), false)
  assert.equal(existsSync(`${appRoot}/public/audio`), false)
})

test('body changes clear stale surface pins and keep Earth highlights controlled', () => {
  const home = read('src/pages/Home.tsx')
  const engine = read('src/lib/globe-engine.ts')

  assert.match(
    home,
    /const handleSelectBody[\s\S]*?setSelectedPin\(null\)[\s\S]*?setFocusBody\(body\)/,
  )
  assert.match(engine, /min\(specAmount,\s*0\.35\)/)
  assert.doesNotMatch(engine, /sunSpecColor[\s\S]{0,100}specAmount \* 1\.2/)
})

test('moon atmosphere data is consistent and obsolete visual assets are absent', () => {
  const facts = read('src/lib/celestial-facts.ts')
  const sandbox = read('src/components/hud/ScaleSandboxModal.tsx')

  assert.doesNotMatch(facts, /atmosphere: 'Karbondioksit, Azot'/)
  assert.match(facts, /Çok ince CO₂, Oksijen ve Hidrojen egzosferi/)
  assert.match(facts, /atmosphere: 'Azot \(%95\), Metan \(%5\)'/)
  assert.match(sandbox, /palette: \['#fff7ae', '#f59e0b', '#9a3412'\]/)
  assert.equal(existsSync(`${appRoot}/public/textures`), false)
  assert.equal(existsSync(`${appRoot}/src/components/hud/CinematicTitleOverlay.tsx`), false)
})

test('ambient belts are deterministic and explicitly described as schematic', () => {
  const asteroids = read('src/lib/asteroids.ts')
  const layers = read('src/components/hud/LayerPanel.tsx')

  assert.doesNotMatch(asteroids, /Math\.random\(/)
  assert.match(asteroids, /Deterministic schematic Asteroid/)
  assert.match(layers, /Schematic Belts/)
})

test('JPL close approaches use a same-origin server proxy with no client query string', () => {
  const smallBodies = read('src/lib/jpl-small-bodies.ts')
  const vite = read('vite.config.ts')
  const proxy = readRepository('api/jpl-cad.ts')

  // No query string on the client URL: the CDN caches per full URL, so
  // arbitrary parameters would each miss the cache and bill a fresh
  // invocation. The proxy rejects them and hardcodes the upstream query.
  assert.match(smallBodies, /JPL_CAD_API_URL = '\/api\/jpl-cad'/)
  assert.match(proxy, /accepts no query parameters/)
  assert.match(proxy, /JPL_NETWORK_ERROR/)
  assert.match(proxy, /JPL_UPSTREAM_ERROR/)
  assert.match(proxy, /JPL_INVALID_PAYLOAD/)
  assert.match(vite, /'\/api\/jpl-cad'/)
  assert.equal(existsSync(`${appRoot}/api/jpl-cad.ts`), true)
})

test('live-data hooks retain real source timestamps after failed refreshes', () => {
  const earth = read('src/hooks/useEarthObservatory.ts')
  const smallBodies = read('src/hooks/useSmallBodies.ts')
  const tle = read('src/hooks/useTleData.ts')
  const metadata = read('src/lib/tle-snapshot-metadata.ts')

  assert.match(earth, /reduceEarthRefreshUpdatedAt/)
  assert.match(smallBodies, /reduceSmallBodyRefreshFailure/)
  assert.match(tle, /TLE_SNAPSHOT_DOWNLOADED_AT/)
  assert.match(metadata, /2026-07-16T11:24:19Z/)
})

test('TLE refresh uses an allow-listed same-origin proxy and exposes propagation diagnostics', () => {
  const tleHook = read('src/hooks/useTleData.ts')
  const worker = read('src/workers/propagator.worker.ts')
  const home = read('src/pages/Home.tsx')
  const vite = read('vite.config.ts')

  assert.equal(existsSync(`${repositoryRoot}/api/tle.ts`), true)
  assert.doesNotMatch(tleHook, /https:\/\/celestrak\.org/)
  assert.match(tleHook, /TLE_API = '\/api\/tle'/)
  assert.match(tleHook, /\$\{TLE_API\}\?feed=/)
  assert.match(vite, /'\/api\/tle'/)
  assert.match(worker, /invalidCount/)
  assert.match(worker, /failedCount/)
  assert.match(home, /describeTleFreshness/)
  assert.match(home, /TLE epoch/i)
})
