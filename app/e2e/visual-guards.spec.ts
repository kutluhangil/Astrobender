import { expect, test } from '@playwright/test'

function expectInsideViewport(box: { x: number; y: number; width: number; height: number } | null, width: number, height: number) {
  expect(box).not.toBeNull()
  if (!box) return
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(width)
  expect(box.y + box.height).toBeLessThanOrEqual(height)
}

test('desktop observatory keeps its primary HUD controls inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  for (const locator of [
    page.getByRole('heading', { name: /A STROBENDER/ }),
    page.getByRole('textbox', { name: 'Gözlemevinde ara' }),
    page.getByRole('heading', { name: 'Dünya (Earth)' }),
    page.getByRole('button', { name: 'Sistem veri durumunu göster' }),
  ]) {
    expectInsideViewport(await locator.boundingBox(), 1440, 900)
  }
})

test('mobile observatory keeps essential controls reachable and opens disclosures', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  const search = page.getByRole('textbox', { name: 'Gözlemevinde ara' })
  expectInsideViewport(await search.boundingBox(), 390, 844)

  await page.getByRole('button', { name: 'Yöntem, veri ve gizlilik bilgisi' }).click()
  const dialog = page.getByRole('dialog', { name: 'Yöntem, veri ve gizlilik' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Canlı veri davranışı')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})
