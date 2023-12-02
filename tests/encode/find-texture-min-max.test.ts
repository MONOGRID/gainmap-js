import { expect } from '@playwright/test'

import { test } from '../testWithCoverage'
import { findTextureMinMaxInBrowser } from './find-texture-min-max'

test('finds max values in exr', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const result = await page.evaluate(findTextureMinMaxInBrowser, { file: 'files/memorial.exr' })

  expect(JSON.stringify(result)).toMatchSnapshot()
})

test('finds min values in exr', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const result = await page.evaluate(findTextureMinMaxInBrowser, { file: 'files/gray.exr', mode: 'min' as const })

  expect(JSON.stringify(result)).toMatchSnapshot()
})
