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

  // The very first navigation in a fresh browser context is never
  // service-worker-controlled (the registration script runs after
  // main.tsx has already dispatched Earth's default texture fetches), so
  // those first-load requests bypass the fetch listener entirely — this is
  // normal, spec-compliant service worker behavior, not a bug. Wait for the
  // worker to activate, then reload once *online* so the reload's texture
  // requests are actually intercepted and cached.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await expect(page.locator('canvas')).toBeVisible()

  // Home defaults to focusing Earth, which loads its day/night/cloud
  // textures — wait for at least one to land in the runtime texture cache.
  // Polled from Node via page.evaluate() rather than page.waitForFunction():
  // an async predicate passed to waitForFunction does not reliably await
  // its own Cache Storage calls in this Playwright/Chromium combination
  // (verified with a minimal repro unrelated to caches/service workers —
  // it resolves after a single poll regardless of the predicate's actual
  // return value), so it doesn't genuinely wait here.
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const cache = await caches.open('astrobender-textures-v1')
          return (await cache.keys()).length
        }),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0)

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
