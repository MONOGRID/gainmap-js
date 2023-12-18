import { ConsoleMessage, expect } from '@playwright/test'

import { test } from '../../testWithCoverage'
import { testGainMapLoaderInBrowser } from './gainmap-loader'

// const matrix = [
//   '01.jpg',
//   '02.jpg',
//   '03.jpg',
//   '04.jpg',
//   '05.jpg',
//   '06.jpg',
//   '07.jpg',
//   '08.jpg',
//   '09.jpg',
//   '10.jpg',
//   'pisa-4k.jpg',
//   'spruit_sunrise_4k.jpg',
//   'abandoned_bakery_16k.jpg'
// ]

// for (const testFile of matrix) {

// }

test('loads from webp', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  await page.evaluate(testGainMapLoaderInBrowser, {
    sdr: 'files/spruit_sunrise_4k.webp',
    gainmap: 'files/spruit_sunrise_4k-gainmap.webp',
    metadata: 'files/spruit_sunrise_4k.json'
  })

  await expect(page).toHaveScreenshot('render.png')
})

test('loads from webp sync', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const logs: string[] = []
  page.on('console', (m: ConsoleMessage) => {
    logs.push(m.text())
  })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  await page.evaluate(testGainMapLoaderInBrowser, {
    sync: true,
    sdr: 'files/spruit_sunrise_4k.webp',
    gainmap: 'files/spruit_sunrise_4k-gainmap.webp',
    metadata: 'files/spruit_sunrise_4k.json'
  })

  // test loading progress happens
  expect(logs.find(mess => mess.match(/loading/gi))).toBeTruthy()

  await expect(page).toHaveScreenshot('render.png')
})

test('throws with an invalid sdr', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(testGainMapLoaderInBrowser, {
      sdr: 'files/invalid_image.png',
      gainmap: 'files/spruit_sunrise_4k-gainmap.webp',
      metadata: 'files/spruit_sunrise_4k.json'
    })
  }

  await expect(shouldThrow).rejects.toThrow(/The source image could not be decoded/)
})

test('throws with an invalid gainmap', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(testGainMapLoaderInBrowser, {
      sdr: 'files/spruit_sunrise_4k.webp',
      gainmap: 'files/invalid_image.png',
      metadata: 'files/spruit_sunrise_4k.json'
    })
  }

  await expect(shouldThrow).rejects.toThrow(/The source image could not be decoded/)
})

test('throws with it doesn\'t find the sdr', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(testGainMapLoaderInBrowser, {
      sdr: 'nope',
      gainmap: 'files/spruit_sunrise_4k-gainmap.webp',
      metadata: 'files/spruit_sunrise_4k.json'
    })
  }

  await expect(shouldThrow).rejects.toThrow(/404/)
})

test('throws with it doesn\'t find the gainmap', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(testGainMapLoaderInBrowser, {
      sdr: 'files/spruit_sunrise_4k.webp',
      gainmap: 'nope',
      metadata: 'files/spruit_sunrise_4k.json'
    })
  }

  await expect(shouldThrow).rejects.toThrow(/404/)
})

test('throws with it doesn\'t find the metadata', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(testGainMapLoaderInBrowser, {
      sdr: 'files/spruit_sunrise_4k.webp',
      gainmap: 'files/spruit_sunrise_4k-gainmap.webp',
      metadata: 'nope'
    })
  }

  await expect(shouldThrow).rejects.toThrow(/404/)
})
