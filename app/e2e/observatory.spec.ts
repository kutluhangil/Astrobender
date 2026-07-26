import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.getByRole('heading', { name: /A STROBENDER/ })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Gözlemevinde ara' })).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('unified search prioritizes exact astronomy catalog matches', async ({ page }) => {
  const search = page.getByRole('textbox', { name: 'Gözlemevinde ara' })
  await search.fill('Ori')
  const results = page.getByRole('listbox', { name: 'Arama sonuçları' })
  await expect(results.getByRole('option').first()).toContainText('Orion')
  await search.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Orion' })).toContainText(
    'temsili yıldız çizgisi görünür',
  )
})

test('surface sites open sourced bilingual coordinate details', async ({ page }) => {
  await page.getByRole('button', { name: 'Arayüzü İngilizce yap' }).click()
  const search = page.getByRole('textbox', { name: 'Search the observatory' })
  await search.fill('Kandilli')
  await search.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Kandilli Observatory' })
  await expect(dialog).toContainText('41.06° N, 29.07° E')
  await expect(dialog.getByRole('link', { name: /Official source/ })).toHaveAttribute(
    'href',
    'https://www.koeri.boun.edu.tr/new/en',
  )
  await page.getByRole('button', { name: '🧊 Europa', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Europa (Europa)' })).toBeVisible()
})

test('body controls still navigate to Europa without changing the Earth default', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Dünya (Earth)' })).toBeVisible()
  await page.getByRole('button', { name: '🧊 Europa', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Europa (Europa)' })).toBeVisible()
  await expect(page.getByText('Fiziksel Profil').first()).toBeVisible()
  await expect(page.getByText(/olası küresel tuzlu okyanus/).first()).toBeVisible()
  const callout = page.getByText('HEDEF KİLİDİ / EUROPA')
  await expect(callout).toBeVisible()
  await expect(callout).toHaveCount(0, { timeout: 7_000 })
})

test('keyboard search supports arrow navigation and NORAD selection', async ({ page }) => {
  const search = page.getByRole('textbox', { name: 'Gözlemevinde ara' })
  await search.fill('25544')
  await search.press('Enter')
  await expect(page.getByText('NORAD 25544')).toBeVisible()
  await expect(page.getByText('ISS (ZARYA)')).toBeVisible()
})

test('Earth Observatory isolates source failures and keeps the globe usable', async ({ page }) => {
  await page.route('https://eonet.gsfc.nasa.gov/**', (route) =>
    route.fulfill({ status: 503, body: 'EONET maintenance' }),
  )
  await page.route('https://earthquake.usgs.gov/**', (route) =>
    route.fulfill({ status: 503, body: 'USGS maintenance' }),
  )
  await page.route('https://services.swpc.noaa.gov/**', (route) =>
    route.fulfill({ status: 503, body: 'SWPC maintenance' }),
  )
  await page.getByRole('button', { name: '🌍 Dünya Verisi' }).click()
  await expect(page.getByText(/NASA EONET verisi alınamadı/)).toBeVisible()
  await expect(page.getByText(/USGS Deprem verisi alınamadı/)).toBeVisible()
  await expect(page.getByText(/NOAA Aurora verisi alınamadı/)).toBeVisible()
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Dünya (Earth)' })).toBeVisible()
})

test('mobile light theme and English mode remain operable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Arayüzü İngilizce yap' }).click()
  const themeButton = page.getByRole('button', { name: 'Switch between dark and light themes' })
  await themeButton.click()
  await expect(themeButton).toHaveText('☀️')
  await page.getByRole('button', { name: 'Open layers panel' }).click()
  await expect(page.getByText('Target Body (3D Globe)').last()).toBeVisible()
})

test('reduced-motion preference suppresses decorative CSS motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  const animationDuration = await page.locator('.opening-wordmark').evaluate(
    (element) => getComputedStyle(element).animationDuration,
  )
  expect(animationDuration).toMatch(/^(0\.01ms|1e-05s)$/)
})
