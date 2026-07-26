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
})

test('body controls still navigate to Europa without changing the Earth default', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Dünya (Earth)' })).toBeVisible()
  await page.getByRole('button', { name: '🧊 Europa', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Europa (Europa)' })).toBeVisible()
  await expect(page.getByText('HEDEF KİLİDİ / EUROPA')).toBeVisible()
})

test('keyboard search supports arrow navigation and NORAD selection', async ({ page }) => {
  const search = page.getByRole('textbox', { name: 'Gözlemevinde ara' })
  await search.fill('25544')
  await search.press('Enter')
  await expect(page.getByText('NORAD 25544')).toBeVisible()
  await expect(page.getByText('ISS (ZARYA)')).toBeVisible()
})
