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

test('offline banner appears and clears with connectivity', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /Çevrimdışı/ })).toHaveCount(0)

  await context.setOffline(true)
  await expect(page.getByRole('status').filter({ hasText: /Çevrimdışı/ })).toBeVisible()

  await context.setOffline(false)
  await expect(page.getByRole('status').filter({ hasText: /Çevrimdışı/ })).toHaveCount(0)
})

test('procedural scene and visual tour remain usable after an offline reload', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })

  // The first page load is not worker-controlled. Reload online once so the
  // shell cache can serve the following navigation without any runtime media.
  await page.reload()
  await expect(page.locator('canvas')).toBeVisible()

  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.getByRole('heading', { name: /A STROBENDER/ })).toBeVisible()

  const tour = page.getByRole('button', { name: /GÖRSEL UZAY TURUNU BAŞLAT|START VISUAL SPACE TOUR/ })
  await expect(tour).toBeEnabled()
  await tour.click()
  await expect(page.getByRole('button', { name: /DURDUR|STOP/ })).toBeVisible()

  await context.setOffline(false)
})
