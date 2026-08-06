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

  // Cache *presence* isn't the same as cache *serviceability* — actually
  // fetch one of the cached texture URLs while offline and confirm the
  // fetch listener's cache-first branch really answers it.
  const servedStatus = await page.evaluate(async () => {
    const cache = await caches.open('astrobender-textures-v1')
    const [firstKey] = await cache.keys()
    const response = await fetch(firstKey.url)
    return response.status
  })
  expect(servedStatus).toBe(200)

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

test('core scene still works after going offline', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) return false
    const registration = await navigator.serviceWorker.getRegistration()
    return registration?.active != null
  })

  // As with the texture-caching test above, the very first navigation in a
  // fresh browser context is never service-worker-controlled. Reload once
  // while still online so the service worker actually takes control of the
  // page before we go offline and reload again.
  await page.reload()
  await expect(page.locator('canvas')).toBeVisible()

  await context.setOffline(true)
  await page.reload()

  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.getByRole('heading', { name: /A STROBENDER/ })).toBeVisible()

  const search = page.getByRole('textbox', { name: 'Gözlemevinde ara' })
  await search.fill('Mars')
  await expect(page.getByRole('listbox', { name: 'Arama sonuçları' })).toBeVisible()

  await context.setOffline(false)
})

test('offline range request against runtime-cached narration audio returns 206', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // As with the tests above, reload once online first so this navigation is
  // actually service-worker-controlled before going offline.
  await page.reload()
  await expect(page.locator('canvas')).toBeVisible()

  // Narration audio is runtime-cached (not precached), so the service
  // worker has no copy until something actually requests it. Warm the
  // cache with the exact same kind of request the offline assertion below
  // makes — a ranged fetch — while still online: this is precisely what
  // the SW's cache-first /audio/ branch has to handle on a genuine cache
  // miss (fetch the full file, cache it, synthesize the 206 for the reply).
  const warmStatus = await page.evaluate(async () => {
    const response = await fetch('/audio/astrobender-sinematik-uzay-turu.mp3', {
      headers: { Range: 'bytes=0-99' },
    })
    await response.arrayBuffer()
    return response.status
  })
  expect(warmStatus).toBe(206)

  await context.setOffline(true)

  const result = await page.evaluate(async () => {
    const response = await fetch('/audio/astrobender-sinematik-uzay-turu.mp3', {
      headers: { Range: 'bytes=0-99' },
    })
    return {
      status: response.status,
      contentRange: response.headers.get('content-range'),
      contentLength: response.headers.get('content-length'),
      bodyLength: (await response.arrayBuffer()).byteLength,
    }
  })

  expect(result.status).toBe(206)
  expect(result.contentRange).toMatch(/^bytes 0-99\/\d+$/)
  expect(result.contentLength).toBe('100')
  expect(result.bodyLength).toBe(100)

  await context.setOffline(false)
})

test('cinematic tour narration is playable after an offline reload', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // As with the tests above, reload once online first so this navigation is
  // actually service-worker-controlled before going offline.
  await page.reload()
  await expect(page.locator('canvas')).toBeVisible()

  // Narration audio is runtime-cached (not precached): the offline reload
  // below can only succeed if the service worker already holds a full copy
  // of both tracks from an earlier online request. Home.tsx's own mount
  // effect requests both narration tracks (preload="metadata") to learn
  // their durations, which is what actually warms this cache during normal
  // use — but that request races this test's reload, so wait for the
  // runtime audio cache to actually contain both tracks before going
  // offline rather than relying on that race resolving in time.
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const cache = await caches.open('astrobender-audio-v1')
          return (await cache.keys()).length
        }),
      { timeout: 15_000 },
    )
    .toBeGreaterThanOrEqual(2)

  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('canvas')).toBeVisible()

  // The start-tour button stays disabled until the narration <audio>
  // element's metadata finishes loading — while offline, that load can only
  // succeed if the precached MP3 is actually served from the app-shell
  // cache. Waiting for "enabled" here is the real proof the narration is
  // available offline. (Not asserting a click-through to the active-tour
  // state here: on desktop, the LayerPanel sidebar visually overlaps this
  // button's position — a pre-existing layout issue unrelated to PWA/offline
  // work, tracked separately rather than worked around in this test.)
  const startTourButton = page.getByRole('button', {
    name: /SİNEMATİK UZAY TURUNU BAŞLAT|START CINEMATIC SPACE TOUR/,
  })
  await expect(startTourButton).toBeEnabled({ timeout: 15_000 })

  await context.setOffline(false)
})
