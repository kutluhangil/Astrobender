# PWA + Offline Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ASTROBENDER installable and fully usable offline for its core 3D scene, while caching textures progressively instead of forcing a large upfront download.

**Architecture:** `vite-plugin-pwa` (`injectManifest` strategy) drives a hand-written service worker (`src/sw.ts`) that precaches the app shell + narration audio + small data files, runtime-caches `/textures/*` on a `CacheFirst` basis, and exposes a message-based "prepare for offline" bulk-download flow. The existing per-body solid-color material fallback (`src/lib/planets.ts`) already renders correctly with zero texture bytes, so it is the guaranteed offline baseline — no new fallback rendering path is needed. Live-data sources (TLE, EONET, USGS, NOAA, JPL CAD) already have app-level stale-cache fallbacks and are untouched; only a general online/offline indicator is added.

**Tech Stack:** React 19, TypeScript 5, Vite 7, `vite-plugin-pwa` (new devDependency), Playwright, Node's built-in `node:test`.

## Amendment (during Task 5)

Task 5's implementer found a real gap: Task 3's service worker precaches the
app shell but never serves it — the fetch listener Task 5 adds only handles
`/textures/*`, so an offline `page.reload()` fails outright at the browser
level (nothing intercepts the navigation request). Separately,
`vite-plugin-pwa`'s dev-mode precache manifest (`self.__WB_MANIFEST`) is
always `[]`, so genuine offline-reload behavior can only be verified against
a production build, never the Vite dev server the existing e2e suite runs
against.

Fix (approved): Task 5's fetch listener gains a second branch — same-origin,
non-texture requests are served network-first with a fallback to
`APP_SHELL_CACHE` (and, for navigation requests specifically, a fallback to
the precached `index.html`) when the network fails. `playwright.config.ts`
gains a second project + a second `webServer` entry (`npm run build && npm
run preview`, port 4180) so `e2e/pwa-offline.spec.ts` runs against a real
production build with a real precache list; the existing `chromium` project
keeps running `observatory.spec.ts` (and everything else) against the dev
server unchanged. This is why `pwa-offline.spec.ts` is `testIgnore`d in the
`chromium` project and `testMatch`ed in the new `chromium-pwa-build`
project — same test file, routed to the right server.

## Global Constraints

- Baseline offline scene must render fully (orbits, search, cinematic tour trigger) with zero cached textures — relies on existing `planets.ts` color fallback, not a new one.
- No automatic download beyond the app shell (JS/CSS/HTML + 2 narration MP3s + small JSON/TXT data files). All 85 MB of `public/textures/*` is either cache-as-you-go or explicit user-triggered "prepare for offline."
- Exactly one new dependency: `vite-plugin-pwa`. No workbox-* packages, no image-processing library — the service worker uses only the Cache Storage API directly, and icons are generated with a zero-dependency hand-rolled PNG encoder.
- Service worker registration failure must never block normal app operation (progressive enhancement, log and continue).
- Live-data stale-cache behavior (`src/lib/tle-cache.ts`, `src/hooks/useEarthObservatory.ts`) is unchanged — do not intercept those fetches in the service worker.
- Turkish and English UI copy via the existing `pickLanguage(language, tr, en)` from `@/lib/ui-language`.
- No co-author metadata in commits.

---

### Task 1: Texture size manifest

**Files:**
- Create: `app/scripts/generate-texture-manifest.mjs`
- Create: `app/tests/texture-manifest.test.ts`
- Modify: `app/public/data/texture-manifest.json` (generated output, committed)
- Modify: `app/package.json` (add `generate:texture-manifest` script, add test file to `test` script)

**Interfaces:**
- Produces: `public/data/texture-manifest.json` shaped as `{ totalBytes: number, files: { file: string, bytes: number }[] }`, `file` is a bare filename (e.g. `"mercury-8k.jpg"`), not a path. Tasks 3 and 6 read this file at runtime via `fetch(`${import.meta.env.BASE_URL}data/texture-manifest.json`)`.

- [ ] **Step 1: Write the failing test**

```ts
// app/tests/texture-manifest.test.ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const manifestPath = join(__dirname, '..', 'public', 'data', 'texture-manifest.json')
const texturesDir = join(__dirname, '..', 'public', 'textures')

test('texture manifest matches the files on disk', () => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  const diskFiles = readdirSync(texturesDir)
    .filter((name) => !name.startsWith('.'))
    .sort()

  assert.equal(manifest.files.length, diskFiles.length)

  let expectedTotal = 0
  for (const [index, name] of diskFiles.entries()) {
    const entry = manifest.files[index]
    assert.equal(entry.file, name)
    const bytes = statSync(join(texturesDir, name)).size
    assert.equal(
      entry.bytes,
      bytes,
      `${name} byte size is stale — rerun npm run generate:texture-manifest`,
    )
    expectedTotal += bytes
  }
  assert.equal(manifest.totalBytes, expectedTotal)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --experimental-strip-types --test tests/texture-manifest.test.ts`
Expected: FAIL — `public/data/texture-manifest.json` does not exist (ENOENT).

- [ ] **Step 3: Write the generator script**

```js
// app/scripts/generate-texture-manifest.mjs
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const texturesDir = join(__dirname, '..', 'public', 'textures')
const outDir = join(__dirname, '..', 'public', 'data')
const outPath = join(outDir, 'texture-manifest.json')

const files = readdirSync(texturesDir)
  .filter((name) => !name.startsWith('.'))
  .sort()
  .map((name) => ({ file: name, bytes: statSync(join(texturesDir, name)).size }))

const totalBytes = files.reduce((sum, entry) => sum + entry.bytes, 0)

mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, JSON.stringify({ totalBytes, files }, null, 2) + '\n')

console.log(
  `Wrote ${files.length} entries (${(totalBytes / 1024 / 1024).toFixed(1)} MiB) to ${outPath}`,
)
```

- [ ] **Step 4: Add the npm script and run it**

Add to `app/package.json` `"scripts"`:

```json
"generate:texture-manifest": "node scripts/generate-texture-manifest.mjs",
```

Run: `cd app && npm run generate:texture-manifest`
Expected: `Wrote 31 entries (85.X MiB) to .../public/data/texture-manifest.json`

- [ ] **Step 5: Run test to verify it passes**

Run: `cd app && node --experimental-strip-types --test tests/texture-manifest.test.ts`
Expected: PASS

- [ ] **Step 6: Wire into the test script and commit**

In `app/package.json`, append `tests/texture-manifest.test.ts` to the `"test"` script's file list (same pattern as the other `tests/*.test.ts` entries already there).

```bash
git add app/scripts/generate-texture-manifest.mjs app/tests/texture-manifest.test.ts app/public/data/texture-manifest.json app/package.json
git commit -m "feat: add texture size manifest for offline prepare flow"
```

---

### Task 2: PWA icon set

**Files:**
- Create: `app/scripts/generate-icons.mjs`
- Create: `app/tests/icon-assets.test.ts`
- Create: `app/public/icons/icon-192.png`, `app/public/icons/icon-512.png`, `app/public/icons/icon-512-maskable.png`, `app/public/icons/apple-touch-icon-180.png` (generated output, committed)
- Modify: `app/package.json` (add `generate:icons` script, add test file to `test` script)

**Interfaces:**
- Produces: the four PNG files above, consumed by the manifest config in Task 3 and the `<link rel="apple-touch-icon">` tag in Task 3.

- [ ] **Step 1: Write the failing test**

```ts
// app/tests/icon-assets.test.ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '..', 'public', 'icons')

const EXPECTED = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-512-maskable.png', size: 512 },
  { name: 'apple-touch-icon-180.png', size: 180 },
]

test('generated PWA icons are valid PNGs at the expected size', () => {
  for (const { name, size } of EXPECTED) {
    const buf = readFileSync(join(iconsDir, name))
    assert.deepEqual(
      [...buf.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
      `${name} missing PNG signature`,
    )
    assert.equal(buf.readUInt32BE(16), size, `${name} width`)
    assert.equal(buf.readUInt32BE(20), size, `${name} height`)
    assert.equal(buf[25], 6, `${name} color type should be RGBA (6)`)
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --experimental-strip-types --test tests/icon-assets.test.ts`
Expected: FAIL — icon files don't exist.

- [ ] **Step 3: Write the icon generator (zero dependencies — hand-rolled PNG encoder)**

```js
// app/scripts/generate-icons.mjs
// Renders the ASTROBENDER favicon motif (planet circle + ring + moon dot,
// same colors as the inline SVG favicon in index.html) as PNG icons, sized
// for the web app manifest. No image library: PNG chunks are built by hand
// using Node's built-in zlib for the IDAT deflate stream.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0)
  return Buffer.concat([length, typeBytes, data, crc])
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 6 // color type: RGBA
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0

  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter type: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idatData = deflateSync(raw)

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdrData),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Colors matching the existing favicon (index.html inline SVG).
const TEAL = [14, 116, 144]
const GREEN = [21, 128, 61]
const CYAN = [34, 211, 238]
const SKY = [56, 189, 248]
const NAVY_BG = [4, 6, 10]

function renderIcon(size, { maskable }) {
  const rgba = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  // Maskable icons need an opaque background and content kept inside the
  // safe zone (inner ~80% of the canvas, per the manifest icon spec).
  const planetRadius = maskable ? size * 0.4 * 0.8 : size * 0.44
  const ringRadius = planetRadius * 1.28
  const ringWidth = Math.max(1, size * 0.018)
  const moonRadius = size * 0.045
  const moonX = cx + planetRadius * 0.95
  const moonY = cy - planetRadius * 0.65

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const moonDist = Math.sqrt((x - moonX) ** 2 + (y - moonY) ** 2)
      const ringDist = Math.abs(dist - ringRadius)

      let rgb
      let a = 255
      if (moonDist <= moonRadius) rgb = SKY
      else if (ringDist <= ringWidth / 2) rgb = CYAN
      else if (dist <= planetRadius * 0.95) rgb = GREEN
      else if (dist <= planetRadius) rgb = TEAL
      else if (maskable) rgb = NAVY_BG
      else {
        rgb = [0, 0, 0]
        a = 0
      }

      rgba[i] = rgb[0]
      rgba[i + 1] = rgb[1]
      rgba[i + 2] = rgb[2]
      rgba[i + 3] = a
    }
  }
  return encodePng(size, size, rgba)
}

const targets = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-512-maskable.png', size: 512, maskable: true },
  { name: 'apple-touch-icon-180.png', size: 180, maskable: true },
]

for (const { name, size, maskable } of targets) {
  const png = renderIcon(size, { maskable })
  writeFileSync(join(outDir, name), png)
  console.log(`Wrote ${name} (${size}x${size}, ${png.length} bytes)`)
}
```

- [ ] **Step 4: Add the npm script and run it**

Add to `app/package.json` `"scripts"`:

```json
"generate:icons": "node scripts/generate-icons.mjs",
```

Run: `cd app && npm run generate:icons`
Expected: four `Wrote ...` lines, one per icon file.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd app && node --experimental-strip-types --test tests/icon-assets.test.ts`
Expected: PASS

- [ ] **Step 6: Wire into the test script and commit**

Append `tests/icon-assets.test.ts` to the `"test"` script's file list in `app/package.json`.

```bash
git add app/scripts/generate-icons.mjs app/tests/icon-assets.test.ts app/public/icons app/package.json
git commit -m "feat: generate PWA icon set from the existing favicon motif"
```

---

### Task 3: Service worker registration and app-shell precache

**Files:**
- Create: `app/src/sw.ts`
- Create: `app/tsconfig.sw.json`
- Create: `app/e2e/pwa-offline.spec.ts`
- Modify: `app/vite.config.ts` (add `VitePWA` plugin)
- Modify: `app/index.html` (theme-color meta, apple-touch-icon link)
- Modify: `app/tsconfig.json` (add project reference)
- Modify: `app/tsconfig.app.json` (exclude `src/sw.ts`)
- Modify: `app/eslint.config.js` (service worker globals for `src/sw.ts`)
- Modify: `app/package.json` (add `vite-plugin-pwa` devDependency)

**Interfaces:**
- Consumes: nothing from earlier tasks (icons from Task 2 are referenced by path only).
- Produces: a registered service worker with cache name `astrobender-shell-v1`. Task 5 adds a `fetch` listener and the `astrobender-textures-v1` cache to this same file. Task 6 adds a `message` listener to this same file.

- [ ] **Step 1: Write the failing e2e test**

```ts
// app/e2e/pwa-offline.spec.ts
import { expect, test } from '@playwright/test'

test('service worker registers and activates', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  const active = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false
    const registration = await navigator.serviceWorker.ready
    return registration.active !== null
  })
  expect(active).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm run test:e2e -- pwa-offline.spec.ts`
Expected: FAIL — `navigator.serviceWorker.ready` never resolves (times out) because no service worker is registered yet.

- [ ] **Step 3: Install the dependency**

```bash
cd app && npm install --save-dev vite-plugin-pwa
```

- [ ] **Step 4: Write the service worker skeleton**

```ts
// app/src/sw.ts
/// <reference lib="webworker" />
export {}

declare const self: ServiceWorkerGlobalScope

const APP_SHELL_CACHE = 'astrobender-shell-v1'

// vite-plugin-pwa's injectManifest strategy replaces this literal with the
// real array of { url, revision } entries for the built app shell.
// @ts-expect-error injected by vite-plugin-pwa at build time
const PRECACHE_MANIFEST: { url: string; revision: string | null }[] = self.__WB_MANIFEST

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE)
      await cache.addAll(PRECACHE_MANIFEST.map((entry) => entry.url))
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith('astrobender-shell-') && key !== APP_SHELL_CACHE)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})
```

- [ ] **Step 5: Give the service worker its own TypeScript project**

```json
// app/tsconfig.sw.json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.sw.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2022", "WebWorker"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src/sw.ts"]
}
```

In `app/tsconfig.json`, add to `"references"`:

```json
{ "path": "./tsconfig.sw.json" }
```

In `app/tsconfig.app.json`, add (sibling to `"include"`):

```json
"exclude": ["src/sw.ts"]
```

(`src/sw.ts` uses `self`/`caches`/`ServiceWorkerGlobalScope` from the `WebWorker` lib, which conflicts with the app project's `DOM` lib — it needs its own project.)

- [ ] **Step 6: Allow service worker globals in eslint**

In `app/eslint.config.js`, add a new config object to the exported array, after the existing `files: ['**/*.{ts,tsx}']` block:

```js
{
  files: ['src/sw.ts'],
  languageOptions: {
    globals: { ...globals.browser, ...globals.serviceworker },
  },
},
```

- [ ] **Step 7: Wire the plugin into vite.config.ts**

```ts
// app/vite.config.ts
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        // js/css/html for the app shell, mp3 for cinematic-tour narration,
        // json/txt for the small catalog/TLE snapshot files under
        // public/data. Textures (jpg/webp/png) are deliberately excluded —
        // see Task 5 for why they're runtime-cached instead of precached.
        globPatterns: ['**/*.{js,css,html,mp3,json,txt}'],
        // vite-plugin-pwa's default precache limit is 2 MiB. The two
        // narration MP3s (~5.4 MB, ~6.8 MB) and the TLE snapshot (~2.7 MB)
        // are intentionally precached (Global Constraints: narration must
        // work offline), so the limit must be raised to fit them.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'ASTROBENDER',
        short_name: 'ASTROBENDER',
        description:
          'Gerçek zamanlı uydu takibi ve sıkıştırılmış astronomik ölçekte etkileşimli 3D Güneş Sistemi.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#04060a',
        theme_color: '#04060a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  server: {
    port: 3000,
    proxy: {
      '/api/jpl-cad': {
        target: 'https://ssd-api.jpl.nasa.gov',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/api\/jpl-cad/, '/cad.api'),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('three')) return 'three'
          if (id.includes('satellite.js')) return 'satellite'
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['three', 'satellite.js'],
  },
})
```

(Only the `plugins` array and the added `VitePWA` import changed from the existing file — every other option is unchanged.)

- [ ] **Step 8: Add theme-color and apple-touch-icon to index.html**

In `app/index.html`, inside `<head>`, after the existing `<link rel="icon" ...>` tag:

```html
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />
<meta name="theme-color" content="#04060a" />
```

- [ ] **Step 9: Run the e2e test to verify it passes**

Run: `cd app && npm run test:e2e -- pwa-offline.spec.ts`
Expected: PASS

- [ ] **Step 10: Verify the full build still works**

Run: `cd app && npm run build`
Expected: succeeds; `dist/sw.js` and `dist/manifest.webmanifest` exist in the output.

- [ ] **Step 11: Commit**

```bash
git add app/src/sw.ts app/tsconfig.sw.json app/tsconfig.json app/tsconfig.app.json \
  app/eslint.config.js app/vite.config.ts app/index.html app/e2e/pwa-offline.spec.ts \
  app/package.json app/package-lock.json
git commit -m "feat: register service worker and precache the app shell"
```

---

### Task 4: Online/offline indicator

**Files:**
- Create: `app/src/hooks/useOnlineStatus.ts`
- Create: `app/src/components/hud/OfflineBanner.tsx`
- Modify: `app/src/pages/Home.tsx` (mount the banner)
- Modify: `app/e2e/pwa-offline.spec.ts` (add banner test)

**Interfaces:**
- Produces: `useOnlineStatus(): boolean` — no earlier-task dependency. `<OfflineBanner language={UiLanguage} />` — a self-contained component, no other props.

**Note on test tier:** the spec's Testing section lists a unit test for this hook. The project's `node:test` suite runs in plain Node with no DOM (no `jsdom`/`@testing-library` dependency), and adding one would break the "one new dependency" constraint. Every other hook in this codebase (`useTleData`, `useEarthObservatory`, etc.) is likewise covered only by Playwright e2e, not `node:test` unit tests — this task follows that existing convention. The e2e test below exercises the real `online`/`offline` transitions in a real browser, which is a stronger check than a mocked unit test would be.

- [ ] **Step 1: Write the failing e2e test**

Append to `app/e2e/pwa-offline.spec.ts`:

```ts
test('offline banner appears and clears with connectivity', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /Çevrimdışı/ })).toHaveCount(0)

  await context.setOffline(true)
  await expect(page.getByRole('status').filter({ hasText: /Çevrimdışı/ })).toBeVisible()

  await context.setOffline(false)
  await expect(page.getByRole('status').filter({ hasText: /Çevrimdışı/ })).toHaveCount(0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm run test:e2e -- pwa-offline.spec.ts`
Expected: FAIL — no element with role `status` containing "Çevrimdışı" exists.

- [ ] **Step 3: Write the hook**

```ts
// app/src/hooks/useOnlineStatus.ts
import { useEffect, useState } from 'react'

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return isOnline
}
```

- [ ] **Step 4: Write the banner component**

```tsx
// app/src/components/hud/OfflineBanner.tsx
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface OfflineBannerProps {
  language: UiLanguage
}

export default function OfflineBanner({ language }: OfflineBannerProps) {
  const isOnline = useOnlineStatus()
  if (isOnline) return null

  return (
    <div
      role="status"
      className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-900/90 px-3 py-1.5 text-center text-xs font-medium text-amber-100 backdrop-blur"
    >
      {pickLanguage(
        language,
        'Çevrimdışı — daha önce görülen veriler ve dokular gösteriliyor.',
        'Offline — showing previously cached data and textures.',
      )}
    </div>
  )
}
```

- [ ] **Step 5: Mount it in Home.tsx**

In `app/src/pages/Home.tsx`, add the import near the other `hud` imports:

```tsx
import OfflineBanner from '@/components/hud/OfflineBanner'
```

Then render it as the first element right after the root JSX element opens (immediately before the `{/* ============ TOP BAR ============ */}` comment block, so it stacks above everything else):

```tsx
<OfflineBanner language={uiLanguage} />
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd app && npm run test:e2e -- pwa-offline.spec.ts`
Expected: PASS (both tests in the file)

- [ ] **Step 7: Commit**

```bash
git add app/src/hooks/useOnlineStatus.ts app/src/components/hud/OfflineBanner.tsx \
  app/src/pages/Home.tsx app/e2e/pwa-offline.spec.ts
git commit -m "feat: show an offline indicator distinct from per-source live-data errors"
```

---

### Task 5: Runtime texture caching (cache-as-you-go)

**Files:**
- Modify: `app/src/sw.ts` (add `fetch` listener)
- Modify: `app/e2e/pwa-offline.spec.ts` (add texture-caching test)

**Interfaces:**
- Consumes: `APP_SHELL_CACHE` constant pattern from Task 3 (adds a sibling `TEXTURE_CACHE` constant, same file).
- Produces: cache name `astrobender-textures-v1`, read by Task 6's message handler and Task 7's verification test.

- [ ] **Step 1: Write the failing e2e test**

Append to `app/e2e/pwa-offline.spec.ts`:

```ts
test('a viewed texture is cached and reused offline', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  // Home defaults to focusing Earth, which loads its day/night/cloud
  // textures — wait for at least one to land in the runtime texture cache.
  await page.waitForFunction(async () => {
    const cache = await caches.open('astrobender-textures-v1')
    const keys = await cache.keys()
    return keys.length > 0
  })

  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('canvas')).toBeVisible()

  const cachedAfterReload = await page.evaluate(async () => {
    const cache = await caches.open('astrobender-textures-v1')
    return (await cache.keys()).length
  })
  expect(cachedAfterReload).toBeGreaterThan(0)

  await context.setOffline(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm run test:e2e -- pwa-offline.spec.ts`
Expected: FAIL — `astrobender-textures-v1` cache is never populated (no fetch listener yet).

- [ ] **Step 3: Add the fetch listener**

Append to `app/src/sw.ts` (after the `activate` listener):

```ts
const TEXTURE_CACHE = 'astrobender-textures-v1'

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // Cross-origin requests (NASA/USGS/NOAA/JPL live-data APIs) pass straight
  // through — they already have their own app-level stale-cache fallback.
  if (url.origin !== self.location.origin) return
  if (!url.pathname.includes('/textures/')) return

  event.respondWith(
    (async () => {
      const cache = await caches.open(TEXTURE_CACHE)
      const cached = await cache.match(event.request)
      if (cached) return cached
      const response = await fetch(event.request)
      if (response.ok) await cache.put(event.request, response.clone())
      return response
    })(),
  )
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm run test:e2e -- pwa-offline.spec.ts`
Expected: PASS (all three tests in the file)

- [ ] **Step 5: Commit**

```bash
git add app/src/sw.ts app/e2e/pwa-offline.spec.ts
git commit -m "feat: cache viewed textures for offline reuse"
```

---

### Task 6: "Prepare for offline" bulk download

**Files:**
- Modify: `app/src/sw.ts` (add `message` listener)
- Create: `app/src/hooks/usePrepareOfflineTextures.ts`
- Create: `app/src/components/hud/PrepareOfflineControl.tsx`
- Modify: `app/src/pages/Home.tsx` (mount the control)
- Modify: `app/e2e/pwa-offline.spec.ts` (add prepare-offline test)

**Interfaces:**
- Consumes: `TEXTURE_CACHE` (`astrobender-textures-v1`) from Task 5, same file. `public/data/texture-manifest.json` from Task 1, shape `{ totalBytes: number, files: { file: string, bytes: number }[] }`.
- Produces: `usePrepareOfflineTextures(): { state: PrepareOfflineState, start: () => Promise<void> }` where `PrepareOfflineState = { status: 'idle' | 'loading-manifest' | 'downloading' | 'done' | 'error', done: number, total: number, totalBytes: number | null, error: string | null }`. `<PrepareOfflineControl language={UiLanguage} />` — self-contained, no other props.

- [ ] **Step 1: Write the failing e2e test**

Append to `app/e2e/pwa-offline.spec.ts`:

```ts
test('prepare-for-offline downloads and caches every texture', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  await page.getByRole('button', { name: /Çevrimdışı için hazırla/ }).click()
  await expect(page.getByText(/Çevrimdışı için hazır/)).toBeVisible({ timeout: 60_000 })

  const cachedCount = await page.evaluate(async () => {
    const cache = await caches.open('astrobender-textures-v1')
    return (await cache.keys()).length
  })
  expect(cachedCount).toBeGreaterThan(20)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm run test:e2e -- pwa-offline.spec.ts`
Expected: FAIL — no button with that name exists yet.

- [ ] **Step 3: Add the message listener to the service worker**

Append to `app/src/sw.ts`:

```ts
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'PREPARE_OFFLINE_TEXTURES') return
  const { urls } = event.data as { urls: string[] }
  const client = event.source as Client | null

  event.waitUntil(
    (async () => {
      const cache = await caches.open(TEXTURE_CACHE)
      let done = 0
      for (const textureUrl of urls) {
        try {
          const existing = await cache.match(textureUrl)
          if (!existing) {
            const response = await fetch(textureUrl)
            if (response.ok) await cache.put(textureUrl, response)
          }
        } catch {
          // Network drop mid-batch: leave this one uncached. Already-cached
          // entries are preserved, and re-running the action later only
          // fetches what's still missing.
        }
        done += 1
        client?.postMessage({ type: 'PREPARE_OFFLINE_PROGRESS', done, total: urls.length })
      }
      client?.postMessage({ type: 'PREPARE_OFFLINE_COMPLETE', done, total: urls.length })
    })(),
  )
})
```

- [ ] **Step 4: Write the hook**

```ts
// app/src/hooks/usePrepareOfflineTextures.ts
import { useCallback, useEffect, useRef, useState } from 'react'

export type PrepareOfflineStatus = 'idle' | 'loading-manifest' | 'downloading' | 'done' | 'error'

export interface PrepareOfflineState {
  status: PrepareOfflineStatus
  done: number
  total: number
  totalBytes: number | null
  error: string | null
}

interface TextureManifestEntry {
  file: string
  bytes: number
}

interface TextureManifest {
  totalBytes: number
  files: TextureManifestEntry[]
}

const MANIFEST_URL = `${import.meta.env.BASE_URL}data/texture-manifest.json`

export function usePrepareOfflineTextures() {
  const [state, setState] = useState<PrepareOfflineState>({
    status: 'idle',
    done: 0,
    total: 0,
    totalBytes: null,
    error: null,
  })
  const manifestRef = useRef<TextureManifest | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(MANIFEST_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<TextureManifest>
      })
      .then((manifest) => {
        if (cancelled) return
        manifestRef.current = manifest
        setState((prev) => ({ ...prev, totalBytes: manifest.totalBytes }))
      })
      .catch(() => {
        // Preview-only fetch failure: the button just won't show a size
        // yet. start() retries and surfaces the real error there.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const start = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      setState((prev) => ({ ...prev, status: 'error', error: 'Service worker desteklenmiyor' }))
      return
    }

    setState((prev) => ({ ...prev, status: 'loading-manifest', error: null }))

    let manifest = manifestRef.current
    if (!manifest) {
      try {
        const res = await fetch(MANIFEST_URL)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        manifest = await res.json()
        manifestRef.current = manifest
      } catch (error) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        }))
        return
      }
    }

    const registration = await navigator.serviceWorker.ready
    const controller = registration.active
    if (!controller) {
      setState((prev) => ({ ...prev, status: 'error', error: 'Service worker henüz aktif değil' }))
      return
    }

    const urls = manifest.files.map((f) => `${import.meta.env.BASE_URL}textures/${f.file}`)
    setState({ status: 'downloading', done: 0, total: urls.length, totalBytes: manifest.totalBytes, error: null })

    await new Promise<void>((resolve) => {
      const onMessage = (event: MessageEvent) => {
        if (event.data?.type === 'PREPARE_OFFLINE_PROGRESS') {
          setState((prev) => ({ ...prev, done: event.data.done, total: event.data.total }))
        } else if (event.data?.type === 'PREPARE_OFFLINE_COMPLETE') {
          setState((prev) => ({ ...prev, status: 'done', done: event.data.done, total: event.data.total }))
          navigator.serviceWorker.removeEventListener('message', onMessage)
          resolve()
        }
      }
      navigator.serviceWorker.addEventListener('message', onMessage)
      controller.postMessage({ type: 'PREPARE_OFFLINE_TEXTURES', urls })
    })
  }, [])

  return { state, start }
}
```

- [ ] **Step 5: Write the control component**

```tsx
// app/src/components/hud/PrepareOfflineControl.tsx
import { usePrepareOfflineTextures } from '@/hooks/usePrepareOfflineTextures'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface PrepareOfflineControlProps {
  language: UiLanguage
}

function formatMiB(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MiB`
}

export default function PrepareOfflineControl({ language }: PrepareOfflineControlProps) {
  const { state, start } = usePrepareOfflineTextures()

  if (state.status === 'idle' || state.status === 'error') {
    return (
      <div className="pointer-events-auto fixed bottom-3 right-3 z-30">
        <button
          type="button"
          onClick={start}
          className="rounded-xl border border-cyan-500/25 bg-[#0a0e17]/85 px-3 py-2 font-mono text-[10px] font-semibold text-cyan-200 backdrop-blur-xl"
        >
          {pickLanguage(
            language,
            state.totalBytes
              ? `Çevrimdışı için hazırla (~${formatMiB(state.totalBytes)})`
              : 'Çevrimdışı için hazırla',
            state.totalBytes
              ? `Prepare for offline (~${formatMiB(state.totalBytes)})`
              : 'Prepare for offline',
          )}
        </button>
        {state.status === 'error' && (
          <p className="mt-1 rounded bg-red-950/80 px-2 py-1 text-[10px] text-red-200">{state.error}</p>
        )}
      </div>
    )
  }

  if (state.status === 'loading-manifest') {
    return (
      <div className="pointer-events-auto fixed bottom-3 right-3 z-30 rounded-xl border border-cyan-500/25 bg-[#0a0e17]/85 px-3 py-2 font-mono text-[10px] text-cyan-200 backdrop-blur-xl">
        {pickLanguage(language, 'Hazırlanıyor…', 'Preparing…')}
      </div>
    )
  }

  if (state.status === 'downloading') {
    const percent = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0
    return (
      <div className="pointer-events-auto fixed bottom-3 right-3 z-30 w-52 rounded-xl border border-cyan-500/25 bg-[#0a0e17]/85 px-3 py-2 font-mono text-[10px] text-cyan-200 backdrop-blur-xl">
        <div>
          {pickLanguage(language, 'İndiriliyor', 'Downloading')} {state.done}/{state.total}
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-cyan-400" style={{ width: `${percent}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-auto fixed bottom-3 right-3 z-30 rounded-xl border border-emerald-500/25 bg-[#0a0e17]/85 px-3 py-2 font-mono text-[10px] text-emerald-200 backdrop-blur-xl">
      {pickLanguage(language, 'Çevrimdışı için hazır ✓', 'Ready for offline ✓')}
    </div>
  )
}
```

- [ ] **Step 6: Mount it in Home.tsx**

In `app/src/pages/Home.tsx`, add the import near the other `hud` imports:

```tsx
import PrepareOfflineControl from '@/components/hud/PrepareOfflineControl'
```

Render it once, alongside `<OfflineBanner language={uiLanguage} />` from Task 4:

```tsx
<PrepareOfflineControl language={uiLanguage} />
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd app && npm run test:e2e -- pwa-offline.spec.ts`
Expected: PASS (all four tests in the file)

- [ ] **Step 8: Commit**

```bash
git add app/src/sw.ts app/src/hooks/usePrepareOfflineTextures.ts \
  app/src/components/hud/PrepareOfflineControl.tsx app/src/pages/Home.tsx \
  app/e2e/pwa-offline.spec.ts
git commit -m "feat: add explicit prepare-for-offline texture download"
```

---

### Task 7: Offline-baseline verification and changelog

**Files:**
- Modify: `app/e2e/pwa-offline.spec.ts` (add the end-to-end offline-baseline test)
- Modify: `CHANGELOG.md` (repo root)

**Interfaces:**
- Consumes: everything from Tasks 3–6 together — this task adds no new production code, only the integration test the spec's Testing section calls for.

- [ ] **Step 1: Write the offline-baseline test**

Append to `app/e2e/pwa-offline.spec.ts`:

```ts
test('core scene still works after going offline', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) return false
    const registration = await navigator.serviceWorker.getRegistration()
    return registration?.active != null
  })

  await context.setOffline(true)
  await page.reload()

  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.getByRole('heading', { name: /A STROBENDER/ })).toBeVisible()

  const search = page.getByRole('textbox', { name: 'Gözlemevinde ara' })
  await search.fill('Mars')
  await expect(page.getByRole('listbox', { name: 'Arama sonuçları' })).toBeVisible()

  await context.setOffline(false)
})
```

- [ ] **Step 2: Run the full e2e suite**

Run: `cd app && npm run test:e2e -- pwa-offline.spec.ts`
Expected: PASS (all five tests in the file)

- [ ] **Step 3: Add the CHANGELOG entry**

Prepend a new dated section at the top of `CHANGELOG.md` (matching the existing format — see the `## 2026-07-26` section already there):

```markdown
## 2026-08-06

- Added installable PWA support: the app shell, cinematic narration, and small data files precache for offline use; the existing per-body color fallback renders the full scene with zero cached textures; viewed textures cache automatically for reuse offline; and an explicit "prepare for offline" control downloads the full 85 MB texture set on request.
```

- [ ] **Step 4: Run the full verification pipeline**

Run: `cd app && npm run verify`
Expected: `test`, `lint`, `build`, and `test:e2e` all pass.

- [ ] **Step 5: Commit**

```bash
git add app/e2e/pwa-offline.spec.ts CHANGELOG.md
git commit -m "test: verify the offline baseline scene end-to-end"
```
