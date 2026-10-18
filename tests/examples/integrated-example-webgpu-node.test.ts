import { expect } from '@playwright/test'

import { test } from '../testWithCoverage'
import { setupRoutes } from './shared'

test('renders the WebGPU node example correctly', async ({ page, context }) => {
  await setupRoutes(context)
  await page.goto('/examples/integrated/webgpu-node.html', { waitUntil: 'networkidle' })
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

test('switches source and display headroom in the WebGPU node example', async ({ page, context }) => {
  await setupRoutes(context)
  await page.goto('/examples/integrated/webgpu-node.html', { waitUntil: 'networkidle' })
  await expect(page.locator('canvas').first()).toBeAttached()
  // the gui is hidden during tests, drive its inputs directly
  await page.locator('select').selectOption('Webp Gain map (separate)', { force: true })
  await expect(page).toHaveScreenshot('webp.png')
  const hdr = await page.screenshot()
  // display headroom slider to 0: SDR rendition
  const headroom = page.locator('.lil-gui input').first()
  await headroom.evaluate((input: HTMLInputElement) => { input.value = '0' })
  await headroom.dispatchEvent('input')
  await expect(page).toHaveScreenshot('webp-sdr.png')
  // the difference is within the screenshot tolerance, make sure the image did re-decode
  // (rendering is deterministic during tests, same bytes = nothing changed)
  expect(Buffer.compare(hdr, await page.screenshot())).not.toBe(0)
})
