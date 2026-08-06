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
