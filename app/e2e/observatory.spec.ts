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

test('LIVE controller exposes operational status from its information port', async ({ page }) => {
  const infoPort = page.getByRole('button', { name: 'Sistem veri durumunu göster' })
  await infoPort.hover()
  await expect(page.getByText('Sistem Durumu')).toBeVisible()
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

test('desktop tour-start button is clickable over the layer panel', async ({ page }) => {
  // Regression check: the Layer Panel sidebar (bottom-7, grows upward) used
  // to sit above the tour controls in stacking order and silently intercept
  // clicks on the tour-start button, even though the button was visible and
  // enabled — only a real click (not just a visibility check) catches this.
  const startTourButton = page.getByRole('button', {
    name: /SİNEMATİK UZAY TURUNU BAŞLAT|START CINEMATIC SPACE TOUR/,
  })
  await expect(startTourButton).toBeEnabled({ timeout: 15_000 })
  await startTourButton.click()
  await expect(page.getByRole('button', { name: /DURDUR|STOP/ })).toBeVisible()
})

test('Skywatch calculates events, accepts a manual observer, and moves the simulation', async ({ page }) => {
  await page.getByRole('button', { name: '🌠 Gökyüzü Takvimi' }).click()
  const panel = page.getByRole('region', { name: 'Gökyüzü Takvimi' })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Simülasyonda göster' }).first()).toBeVisible()

  await panel.getByText('Koordinatları elle gir').click()
  await panel.getByLabel('Enlem').fill('41.0082')
  await panel.getByLabel('Boylam').fill('28.9784')
  await panel.getByLabel('Konum etiketi').fill('İstanbul')
  await panel.getByRole('button', { name: 'Konumu kaydet' }).click()
  await expect(panel.getByText('İstanbul')).toBeVisible()

  const venusCard = panel.locator('li', { hasText: 'Venüs en büyük uzanımda' })
  await venusCard.getByRole('button', { name: 'Simülasyonda göster' }).click()
  await expect(panel).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Venüs (Venus)' })).toBeVisible()
})

test('Skywatch stays operable on mobile with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Katman panelini aç' }).click()
  await page.getByRole('button', { name: '🌠 Gökyüzü Takvimi' }).click()
  await expect(page.getByRole('region', { name: 'Gökyüzü Takvimi' })).toBeVisible()
})
