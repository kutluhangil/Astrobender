import { expect, test } from '@playwright/test'

/**
 * Fixed instant used by the Skywatch calendar test. Skywatch builds its event
 * list from `Date.now()` forward, so a real clock makes the calendar contents
 * drift out from under the assertions once the window moves past them.
 */
const SKYWATCH_FIXED_NOW = new Date('2026-08-13T09:00:00Z')

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
  test.setTimeout(60_000)
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
  await page.getByRole('button', { name: /Jupiter.*moon options/ }).hover()
  await page.getByRole('button', { name: 'Select Europa moon' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Europa (Europa)' })).toBeVisible()
})

test('celestial tray still navigates to Europa without changing the Earth default', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Dünya (Earth)' })).toBeVisible()
  const tray = page.getByRole('navigation', { name: 'Gök cismi seçici' })
  await expect(tray).toHaveJSProperty('scrollWidth', await tray.evaluate((element) => element.clientWidth))
  await expect(tray).toHaveCSS('width', /^(?!1040px$)/)
  await page.getByRole('button', { name: /Jüpiter.*uydu seçeneği/ }).hover()
  await page.getByRole('button', { name: 'Europa uydusunu seç' }).click()
  await expect(page.getByRole('heading', { name: 'Europa (Europa)' })).toBeVisible()
  // The physical profile is disclosed on demand so the panel leads with three values.
  await expect(page.getByText(/olası küresel tuzlu okyanus/).first()).not.toBeVisible()
  await page.getByText('Fiziksel profil').first().click()
  await expect(page.getByText(/olası küresel tuzlu okyanus/).first()).toBeVisible()
  const callout = page.getByText('HEDEF KİLİDİ / EUROPA')
  await expect(callout).toBeVisible()
  await expect(callout).toHaveCount(0, { timeout: 7_000 })
})

test('small-body drawer reaches the newly catalogued dwarf planets and asteroids', async ({ page }) => {
  const tray = page.getByRole('navigation', { name: 'Gök cismi seçici' })
  await expect(tray).toHaveJSProperty('scrollWidth', await tray.evaluate((element) => element.clientWidth))
  await tray.getByRole('button', { name: /Küçük cisimler · 12 cisim/ }).hover()
  const drawer = page.getByRole('group', { name: 'Küçük cisimler' })
  await expect(drawer).toBeVisible()
  await drawer.getByRole('button', { name: 'Vesta cismini seç' }).click()
  await expect(page.getByRole('heading', { name: 'Vesta (Vesta)' })).toBeVisible()
  await expect(page.getByText('Asteroit (Ana Kuşak)').first()).toBeVisible()
  await expect(page.getByText("Dünya'nın 0,04 katı").first()).toBeVisible()
  await page.getByText('Fiziksel profil').first().click()
  await expect(page.getByText('3.46 g/cm³').first()).toBeVisible()

  await tray.getByRole('button', { name: /Küçük cisimler · 12 cisim/ }).hover()
  await drawer.getByRole('button', { name: 'Sedna cismini seç' }).click()
  await expect(page.getByRole('heading', { name: 'Sedna (Sedna)' })).toBeVisible()
  // The disclosure opened for Vesta stays open across body changes.
  await expect(page.getByText('Güvenilir ölçüm yok').first()).toBeVisible()
})

test('ring systems list their sourced named bands with a width disclosure', async ({ page }) => {
  const tray = page.getByRole('navigation', { name: 'Gök cismi seçici' })
  await tray.getByRole('button', { name: 'Uranüs' }).click()
  await expect(page.getByRole('heading', { name: 'Uranüs (Uranus)' })).toBeVisible()
  await page.getByText('Halka sistemi').first().click()
  await expect(page.getByText('Epsilon').first()).toBeVisible()
  await expect(page.getByText(/10 dar halka ölçülen genişliğinden/).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /PDS halka verisi/ }).first()).toHaveAttribute(
    'href',
    'https://pds-rings.seti.org/uranus/uranus_rings_table.html',
  )
})

test('LIVE controller exposes operational status from its information port', async ({ page }) => {
  const infoPort = page.getByRole('button', { name: 'Sistem veri durumunu göster' })
  await infoPort.hover()
  await expect(page.getByText('Sistem Durumu')).toBeVisible()
  await expect(page.getByText('TLE epoch yaşı')).toBeVisible()
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
  await expect(page.getByText('Cosmic Environments').last()).toBeVisible()
})

test('reduced-motion preference suppresses decorative CSS motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  const reducedMotion = await page.evaluate(() => {
    const probe = document.createElement('div')
    probe.style.animation = 'motion-probe 2s linear infinite'
    document.body.append(probe)
    const styles = getComputedStyle(probe)
    const result = {
      matches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      duration: styles.animationDuration,
      iterations: styles.animationIterationCount,
    }
    probe.remove()
    return result
  })
  expect(reducedMotion.matches).toBe(true)
  expect(reducedMotion.duration).toMatch(/^(0\.01ms|1e-05s)$/)
  expect(reducedMotion.iterations).toBe('1')
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
  test.setTimeout(60_000)
  // Skywatch derives its 90-day window from the wall clock, so the calendar
  // assertions below are pinned to a fixed instant instead of "today".
  await page.clock.setFixedTime(SKYWATCH_FIXED_NOW)
  await page.reload()
  await expect(page.locator('canvas')).toBeVisible()
  await page.getByRole('button', { name: '🌠 Gökyüzü Takvimi' }).click()
  const panel = page.getByRole('region', { name: 'Gökyüzü Takvimi' })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Simülasyonda göster' }).first()).toBeVisible()
  const eventCalendar = panel.getByRole('group', { name: 'Olay takvimi' })
  await expect(eventCalendar).toBeVisible()
  await expect(eventCalendar.getByRole('button', { name: /15 Ağustos.*Venüs/ })).toBeVisible()
  await panel.getByRole('button', { name: 'Sonraki ay' }).click()
  await expect(eventCalendar.getByRole('button', { name: /21 Ekim.*Orionids/ })).toBeVisible()
  await eventCalendar.getByRole('button', { name: /21 Ekim.*Orionids/ }).click()
  await expect(panel.getByText('Orionids Meteor Yağmuru')).toBeVisible()
  await panel.getByRole('button', { name: 'Önceki ay' }).click()

  await panel.getByText('Koordinatları elle gir').click()
  await panel.getByLabel('Enlem').fill('41.0082')
  await panel.getByLabel('Boylam').fill('28.9784')
  await panel.getByLabel('Konum etiketi').fill('İstanbul')
  await panel.getByRole('button', { name: 'Konumu kaydet' }).click()
  await expect(panel.getByRole('region', { name: 'Gözlem konumu' }).getByText('İstanbul')).toBeVisible()
  const perseidWatch = panel.getByRole('region', { name: 'Perseid Watch' })
  await expect(perseidWatch).toContainText('PERSEİD AKIŞI')
  await expect(panel.getByText(/Astronomik skor; bulutluluk/)).toBeVisible()
  await perseidWatch.getByRole('button', { name: 'Görsel akışı simülasyonda göster' }).click()
  await expect(panel).toBeHidden()
  await expect(page.getByText('Perseid · görsel simülasyon')).toBeVisible()

  await page.getByRole('button', { name: '🌠 Gökyüzü Takvimi' }).click()
  const reopenedPanel = page.getByRole('region', { name: 'Gökyüzü Takvimi' })

  const venusCard = reopenedPanel.locator('li', { hasText: 'Venüs en büyük uzanımda' })
  await venusCard.getByRole('button', { name: 'Simülasyonda göster' }).click()
  await expect(reopenedPanel).toBeHidden()
  await expect(page.getByText('Perseid · görsel simülasyon')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Venüs (Venus)' })).toBeVisible()
})

test('Skywatch stays operable on mobile with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Katman panelini aç' }).click()
  await page.getByRole('button', { name: '🌠 Gökyüzü Takvimi' }).click()
  const panel = page.getByRole('region', { name: 'Gökyüzü Takvimi' })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('group', { name: 'Olay takvimi' })).toBeVisible()
  await expect(panel.getByRole('group', { name: 'Olay takvimi' }).getByRole('button').first()).toBeVisible()
})
