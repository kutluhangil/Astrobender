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
