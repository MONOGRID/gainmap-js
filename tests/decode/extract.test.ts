import { expect } from '@playwright/test'

import { test } from '../testWithCoverage'
import { extractInBrowser } from './extract'

test('extracts from a valid jpeg', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const result = await page.evaluate(extractInBrowser, { file: 'files/spruit_sunrise_4k.jpg' })

  expect(result).not.toBeUndefined()
})

test('throws from an invalid jpeg', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(extractInBrowser, { file: 'files/plain-jpeg.jpg' })
  }
  await expect(shouldThrow).rejects.toThrowError(/XMP metadata not found/)
})
