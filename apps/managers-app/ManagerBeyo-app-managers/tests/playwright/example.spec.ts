import { test, expect } from '@playwright/test'

test('app loads without runtime errors', async ({ page }) => {
  const consoleErrors: string[] = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })

  page.on('pageerror', (error) => {
    consoleErrors.push(error.message)
  })

  await page.goto('http://localhost:5173')

  await expect(
    page.locator('text=ManagerBeyo')
  ).toBeVisible()

  expect(consoleErrors).toEqual([])
})