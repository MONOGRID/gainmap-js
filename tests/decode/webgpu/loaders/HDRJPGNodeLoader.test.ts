import { ConsoleMessage, expect } from '@playwright/test'

import { disableCreateImageBitmap } from '../../../disableBrowserFeatures'
import { test } from '../../../testWithCoverage'
import { compareNodeLoaderWithLegacyInBrowser, countNodeDecodesInBrowser, testNodeLoaderInBrowser } from './node-loaders'

// screenshots are copies of the HDRJPGLoader.test.ts ones:
// the node loader must render the same as the legacy loader

test.beforeEach(async ({ page, browserName }) => {
  test.skip(browserName === 'firefox' || browserName === 'webkit', 'WebGPU not fully supported in Firefox and WebKit')
  await page.goto('/tests/testbed-webgpu.html', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('script')).toBeAttached()
})

test('loads from jpeg (WebGPU node)', async ({ page }) => {
  await page.evaluate(testNodeLoaderInBrowser, { files: 'files/spruit_sunrise_4k.jpg' })
  await expect(page).toHaveScreenshot('render.png')
})

test('loads from jpeg sync (WebGPU node)', async ({ page }) => {
  const logs: string[] = []
  page.on('console', (m: ConsoleMessage) => { logs.push(m.text()) })

  await page.evaluate(testNodeLoaderInBrowser, { files: 'files/spruit_sunrise_4k.jpg', sync: true })

  // test loading progress happens
  expect(logs.find(mess => mess.match(/loading/gi))).toBeTruthy()
  await expect(page).toHaveScreenshot('render.png')
})

test('loads from jpeg in browsers where createImageBitmap is not available (WebGPU node)', async ({ page }) => {
  await page.evaluate(disableCreateImageBitmap)
  await page.evaluate(testNodeLoaderInBrowser, { files: 'files/spruit_sunrise_4k.jpg' })
  await expect(page).toHaveScreenshot('render-no-create-image-bitmap.png')
})

test('loads a plain jpeg anyway (WebGPU node)', async ({ page }) => {
  await page.evaluate(testNodeLoaderInBrowser, { files: 'files/plain-jpeg.jpg' })
  await expect(page).toHaveScreenshot('render-plain.png')
})

test('decodes the same as the legacy loader (WebGPU node)', async ({ page }) => {
  const full = await page.evaluate(compareNodeLoaderWithLegacyInBrowser, { files: 'files/spruit_sunrise_4k.jpg' })
  expect(full.width).toBe(full.legacyWidth)
  expect(full.height).toBe(full.legacyHeight)
  expect(full.maxRelativeDifference).toBeLessThan(1e-3)

  const boosted = await page.evaluate(compareNodeLoaderWithLegacyInBrowser, { files: 'files/spruit_sunrise_4k.jpg', maxDisplayBoost: 4 })
  expect(boosted.maxRelativeDifference).toBeLessThan(1e-3)
})

test('decodes only when something changes (WebGPU node)', async ({ page }) => {
  const phases = await page.evaluate(countNodeDecodesInBrowser, { files: 'files/spruit_sunrise_4k.jpg' })
  expect(phases.map(p => p.decodes)).toEqual([1, 0, 1, 0])
  // PMREM is flagged for regeneration only on decode
  expect(phases[1].pmremVersion).toBe(phases[0].pmremVersion)
  expect(phases[2].pmremVersion).toBe(phases[1].pmremVersion + 1)
  expect(phases[3].pmremVersion).toBe(phases[2].pmremVersion)
})

test('throws with an invalid image (WebGPU node)', async ({ page }) => {
  const shouldThrow = async () => {
    await page.evaluate(testNodeLoaderInBrowser, { files: 'files/invalid_image.png' })
  }
  await expect(shouldThrow).rejects.toThrow(/The source image could not be decoded/)
})

test('throws with a not found image (WebGPU node)', async ({ page }) => {
  const shouldThrow = async () => {
    await page.evaluate(testNodeLoaderInBrowser, { files: 'nope' })
  }
  await expect(shouldThrow).rejects.toThrow(/404/)
})
