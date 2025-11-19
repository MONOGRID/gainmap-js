import { expect } from '@playwright/test'

import { test } from '../testWithCoverage'
import { setupRoutes } from './shared'

test('renders the WebGPU example correctly', async ({ page, context }) => {
  await setupRoutes(context)
  await page.goto('/examples/integrated/webgpu.html', { waitUntil: 'networkidle' })
  await expect(page.locator('canvas').first()).toBeAttached()
  await expect(page).toHaveScreenshot('initial.png')
  await page.mouse.wheel(0, -9000)
  await expect(page).toHaveScreenshot('zoomed-in.png')
  await page.mouse.wheel(0, 9000)
  await page.mouse.move(250, 250, { steps: 20 })
  await page.mouse.down({ button: 'left' })
  await page.mouse.move(250, 500, { steps: 20 })
  await page.mouse.up({ button: 'left' })
  await expect(page).toHaveScreenshot('zoomed-out-from-above.png')
})
