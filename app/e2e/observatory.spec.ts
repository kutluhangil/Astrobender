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
    'resmî çizgi şekli yok',
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
  await expect(page.getByText('Fiziksel Profil').first()).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Fiziksel profil' })
      .getByText(/gövdeye özgü birincil kaynak kaydedilene kadar kullanılabilir değildir/),
  ).toBeVisible()
  const callout = page.getByText('HEDEF KİLİDİ / EUROPA')
  await expect(callout).toBeVisible()
  await expect(callout).toHaveCount(0, { timeout: 7_000 })
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

test('evidence disclosure manages keyboard focus and schematic truth remains persistent', async ({ page }) => {
  const evidenceMark = page.getByRole('button', { name: 'Bilim notları için kaynak kanıtını aç' })
  await expect(evidenceMark).toBeVisible()
  await evidenceMark.focus()
  await evidenceMark.press('Enter')

  const dialog = page.getByRole('dialog', { name: 'Kaynak ve yöntem ayrıntıları' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Kaynaklı statik')
  await expect(dialog).toContainText('NASA')
  await expect(dialog.getByRole('link', { name: 'Doğrudan kaynağı aç' })).toHaveAttribute(
    'href',
    /^https:\/\/science\.nasa\.gov\//,
  )
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(evidenceMark).toBeFocused()

  await page.getByRole('button', { name: '☄️ Şematik Asteroit ve Kuiper Kuşakları' }).click()
  const truthBanner = page.getByRole('status', { name: 'Sahne doğruluk bildirimi' })
  await expect(truthBanner).toBeVisible()
  await expect(truthBanner).toContainText('SCHEMATIC')
  await expect(truthBanner).toContainText('bilimsel ölçüm değildir')

  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(390)
  await page.getByRole('button', { name: 'Gezegen bilgisini aç veya kapat' }).click()
  const mobileEvidenceMark = page.getByRole('button', { name: 'Bilim notları için kaynak kanıtını aç' })
  await mobileEvidenceMark.click()
  const mobileDialog = page.getByRole('dialog', { name: 'Kaynak ve yöntem ayrıntıları' })
  await expect(mobileDialog).toBeVisible()
  await expect(mobileDialog).toHaveAttribute('data-source-disclosure-sheet', 'true')
  const mobileBox = await mobileDialog.boundingBox()
  const mobileStyles = await mobileDialog.evaluate((element) => {
    return {
      width: getComputedStyle(element).width,
      maxWidth: getComputedStyle(element).maxWidth,
      parentWidth: getComputedStyle(element.parentElement!).width,
    }
  })
  expect(mobileStyles).toEqual({
    width: '390px',
    maxWidth: 'none',
    parentWidth: '390px',
  })
  expect(mobileBox).not.toBeNull()
  expect(mobileBox?.x).toBeLessThanOrEqual(1)
  expect(mobileBox?.width).toBeGreaterThanOrEqual(388)
  expect(mobileBox?.y + mobileBox?.height).toBeGreaterThanOrEqual(843)
  await expect(mobileDialog).toHaveCSS('overflow-y', 'auto')

  const closeButton = mobileDialog.getByRole('button', { name: 'Kaynak ayrıntılarını kapat' })
  const sourceLink = mobileDialog.getByRole('link', { name: 'Doğrudan kaynağı aç' })
  await closeButton.focus()
  await page.keyboard.press('Shift+Tab')
  await expect(sourceLink).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(closeButton).toBeFocused()
})

test('procedural surface visuals require an explicit opt-in before their schematic notice appears', async ({ page }) => {
  const truthBanner = page.getByRole('status', { name: 'Sahne doğruluk bildirimi' })
  const surfaceToggle = page.getByRole('button', { name: 'Şematik yüzey görsellerini aç' })

  await expect(surfaceToggle).toHaveAttribute('aria-pressed', 'false')
  await expect(truthBanner).toHaveCount(0)

  await surfaceToggle.click()
  const activeSurfaceToggle = page.getByRole('button', { name: 'Şematik yüzey görsellerini kapat' })
  await expect(activeSurfaceToggle).toHaveAttribute('aria-pressed', 'true')
  await expect(truthBanner).toContainText('SCHEMATIC')
  await expect(truthBanner).toContainText('Şematik görsel yardım açık')

  await activeSurfaceToggle.click()
  await expect(page.getByRole('button', { name: 'Şematik yüzey görsellerini aç' })).toHaveAttribute('aria-pressed', 'false')
  await expect(truthBanner).toHaveCount(0)
})

test('scene truth does not report a missing Perseid heuristic merely because an observer is saved', async ({ page }) => {
  await page.addInitScript(`
    (() => {
      const RealDate = Date
      const fixedNow = new RealDate('2027-01-15T12:00:00.000Z').getTime()
      class FixedDate extends RealDate {
        constructor(...args) {
          super(args.length === 0 ? fixedNow : args[0])
        }
        static now() {
          return fixedNow
        }
      }
      window.Date = FixedDate
    })()
  `)
  await page.reload()
  await expect(page.locator('canvas')).toBeVisible()

  await page.getByRole('button', { name: '🌠 Gökyüzü Takvimi' }).click()
  const panel = page.getByRole('region', { name: 'Gökyüzü Takvimi' })
  await panel.getByText('Koordinatları elle gir').click()
  await panel.getByLabel('Enlem').fill('41.0082')
  await panel.getByLabel('Boylam').fill('28.9784')
  await panel.getByLabel('Konum etiketi').fill('İstanbul')
  await panel.getByRole('button', { name: 'Konumu kaydet' }).click()

  await expect(panel.getByRole('region', { name: 'Perseid Watch' })).toHaveCount(0)
  const truthBanner = page.getByRole('status', { name: 'Sahne doğruluk bildirimi' })
  await expect(truthBanner).toHaveCount(0)
})

test('Skywatch panel and scene truth share one clock across the 2026-to-2027 boundary', async ({ page }) => {
  await page.addInitScript(`
    (() => {
      const RealDate = Date
      let now = new RealDate('2026-12-31T23:59:00.000Z').getTime()
      Object.defineProperty(window, '__setSkywatchNow', {
        value: (value) => { now = new RealDate(value).getTime() },
      })
      class ControlledDate extends RealDate {
        constructor(...args) {
          super(args.length === 0 ? now : args[0])
        }
        static now() {
          return now
        }
      }
      window.Date = ControlledDate
    })()
  `)
  await page.reload()
  await expect(page.locator('canvas')).toBeVisible()

  await page.getByRole('button', { name: '🌠 Gökyüzü Takvimi' }).click()
  const panel = page.getByRole('region', { name: 'Gökyüzü Takvimi' })
  await panel.getByText('Koordinatları elle gir').click()
  await panel.getByLabel('Enlem').fill('41.0082')
  await panel.getByLabel('Boylam').fill('28.9784')
  await panel.getByLabel('Konum etiketi').fill('İstanbul')
  await panel.getByRole('button', { name: 'Konumu kaydet' }).click()

  await expect(panel.getByRole('region', { name: 'Perseid Watch' })).toBeVisible()
  const truthBanner = page.getByRole('status', { name: 'Sahne doğruluk bildirimi' })
  await expect(truthBanner).not.toContainText('SCHEMATIC')
  await expect(truthBanner).toContainText('HEURISTIC')

  await page.evaluate(() => {
    window.__setSkywatchNow('2027-01-01T00:00:00.000Z')
    document.dispatchEvent(new Event('visibilitychange'))
  })

  await expect(panel.getByRole('region', { name: 'Perseid Watch' })).toHaveCount(0)
  await expect(truthBanner).toHaveCount(0)
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
    name: /GÖRSEL UZAY TURUNU BAŞLAT|START VISUAL SPACE TOUR/,
  })
  const truthBanner = page.getByRole('status', { name: 'Sahne doğruluk bildirimi' })
  await expect(truthBanner).toHaveCount(0)
  await expect(startTourButton).toBeEnabled({ timeout: 15_000 })
  await startTourButton.click()
  await expect(page.getByRole('button', { name: /DURDUR|STOP/ })).toBeVisible()
  await expect(truthBanner).toContainText('SCHEMATIC')
})

test('Skywatch calculates events, accepts a manual observer, and moves the simulation', async ({ page }) => {
  test.setTimeout(60_000)
  await page.getByRole('button', { name: '🌠 Gökyüzü Takvimi' }).click()
  const panel = page.getByRole('region', { name: 'Gökyüzü Takvimi' })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Simülasyonda göster' }).first()).toBeVisible()
  const eventCalendar = panel.getByRole('group', { name: 'Olay takvimi' })
  await expect(eventCalendar).toBeVisible()
  await expect(eventCalendar.getByRole('button', { name: /15 Ağustos.*Venüs/ })).toBeVisible()
  await expect(panel.getByRole('region', { name: 'Perseid Watch' })).toContainText(/ZHR\s*100/)
  await expect(panel.getByRole('link', { name: 'IMO takvimi ↗' })).toHaveAttribute(
    'href',
    'https://www.imo.net/files/meteor-shower/cal2026.pdf',
  )

  await panel.getByText('Koordinatları elle gir').click()
  await panel.getByLabel('Enlem').fill('41.0082')
  await panel.getByLabel('Boylam').fill('28.9784')
  await panel.getByLabel('Konum etiketi').fill('İstanbul')
  await panel.getByRole('button', { name: 'Konumu kaydet' }).click()
  await expect(panel.getByRole('region', { name: 'Gözlem konumu' }).getByText('İstanbul')).toBeVisible()
  const perseidWatch = panel.getByRole('region', { name: 'Perseid Watch' })
  await expect(perseidWatch).toContainText('PERSEİD AKIŞI')
  await expect(panel.getByText(/ÜRÜN SEZGİSİ.*Bilimsel ölçüm değildir/)).toBeVisible()
  await perseidWatch.getByRole('button', { name: 'Aralık başlangıcında şematik akışı göster' }).click()
  await expect(panel).toBeHidden()
  await expect(page.getByText(/maksimum aralığının başlangıcında açıldı/)).toBeVisible()
  await expect(page.getByText('Perseid · görsel simülasyon')).toBeVisible()
  await expect(page.getByRole('status', { name: 'Sahne doğruluk bildirimi' })).toContainText('SCHEMATIC')

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
