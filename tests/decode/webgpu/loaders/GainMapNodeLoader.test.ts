import { ConsoleMessage, expect } from '@playwright/test'

import { test } from '../../../testWithCoverage'
import { compareNodeLoaderWithLegacyInBrowser, testNodeLoaderInBrowser } from './node-loaders'

// screenshots are copies of the GainMapLoader.test.ts ones:
// the node loader must render the same as the legacy loader

const files: [string, string, string] = [
  'files/spruit_sunrise_4k.webp',
  'files/spruit_sunrise_4k-gainmap.webp',
  'files/spruit_sunrise_4k.json'
]

test.beforeEach(async ({ page, browserName }) => {
  test.skip(browserName === 'firefox' || browserName === 'webkit', 'WebGPU not fully supported in Firefox and WebKit')
  await page.goto('/tests/testbed-webgpu.html', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('script')).toBeAttached()
})

test('loads from webp (WebGPU node)', async ({ page }) => {
  await page.evaluate(testNodeLoaderInBrowser, { files })
  await expect(page).toHaveScreenshot('render.png')
})

test('loads from webp sync (WebGPU node)', async ({ page }) => {
  const logs: string[] = []
  page.on('console', (m: ConsoleMessage) => { logs.push(m.text()) })

  await page.evaluate(testNodeLoaderInBrowser, { files, sync: true })

  // test loading progress happens
  expect(logs.find(mess => mess.match(/loading/gi))).toBeTruthy()
  await expect(page).toHaveScreenshot('render.png')
})

test('decodes the same as the legacy loader (WebGPU node)', async ({ page }) => {
  const result = await page.evaluate(compareNodeLoaderWithLegacyInBrowser, { files })
  expect(result.width).toBe(result.legacyWidth)
  expect(result.height).toBe(result.legacyHeight)
  expect(result.maxRelativeDifference).toBeLessThan(1e-3)
})

const errorCases: { name: string, files: [string, string, string], error: RegExp }[] = [
  { name: 'throws with an invalid sdr', files: ['files/invalid_image.png', files[1], files[2]], error: /The source image could not be decoded/ },
  { name: 'throws with an invalid gainmap', files: [files[0], 'files/invalid_image.png', files[2]], error: /The source image could not be decoded/ },
  { name: 'throws when it doesn\'t find the sdr', files: ['nope', files[1], files[2]], error: /404/ },
  { name: 'throws when it doesn\'t find the gainmap', files: [files[0], 'nope', files[2]], error: /404/ },
  { name: 'throws when it doesn\'t find the metadata', files: [files[0], files[1], 'nope'], error: /404/ }
]

for (const { name, files, error } of errorCases) {
  test(`${name} (WebGPU node)`, async ({ page }) => {
    const shouldThrow = async () => {
      await page.evaluate(testNodeLoaderInBrowser, { files })
    }
    await expect(shouldThrow).rejects.toThrow(error)
  })
}
