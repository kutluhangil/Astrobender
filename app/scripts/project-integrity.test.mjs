import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('..', import.meta.url))
const read = (path) => readFileSync(new URL(path, `${new URL('..', import.meta.url)}/`), 'utf8')

test('ASTROBENDER is the only product name in the application source', () => {
  const fallback = read('src/components/FallbackTable.tsx')
  assert.doesNotMatch(fallback, new RegExp(['ORBIT', 'VEIL'].join(' '), 'i'))
  assert.match(fallback, />STROBENDER/)
})

test('document language and font policy are self-contained', () => {
  const html = read('index.html')
  assert.match(html, /<html lang="tr">/)
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/)
})

test('production responses include baseline security headers', () => {
  const vercel = read('vercel.json')
  for (const header of [
    'Content-Security-Policy',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Permissions-Policy',
    'X-Frame-Options',
  ]) {
    assert.match(vercel, new RegExp(header))
  }
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

test('partial moon mosaics declare their no-data tone', () => {
  const planets = read('src/lib/planets.ts')
  for (const [moon, tone] of [
    ['europa', 'dark'],
    ['titania', 'dark'],
    ['oberon', 'dark'],
    ['triton', 'light'],
  ]) {
    assert.match(
      planets,
      new RegExp(`id: '${moon}'[\\s\\S]*?missingTextureTone: '${tone}'`),
      moon,
    )
  }
})

test('known invalid and duplicate textures are removed', () => {
  for (const path of [
    'public/textures/milkyway-4k.jpg',
    'public/textures/milkyway-raw.jpg',
    'public/textures/milkyway.jpg',
    'public/textures/sun.jpg',
    'public/textures/sun.png',
    'public/textures/earth-day.jpg',
    'public/textures/earth-night.jpg',
  ]) {
    assert.equal(existsSync(`${appRoot}/${path}`), false, path)
  }
})
