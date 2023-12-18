import { expect } from '@playwright/test'

import { disableCreateImageBitmap } from '../../disableBrowserFeatures'
import { test } from '../../testWithCoverage'
import { testHDRJpegLoaderInBrowser } from './hdr-jpg-loader'

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

test('loads from jpeg', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  await page.evaluate(testHDRJpegLoaderInBrowser, { file: 'files/spruit_sunrise_4k.jpg' })

  await expect(page).toHaveScreenshot('render.png')
})

test('loads from jpeg in browsers where createImageBitmap is not available', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  await page.evaluate(disableCreateImageBitmap)
  await page.evaluate(testHDRJpegLoaderInBrowser, { file: 'files/spruit_sunrise_4k.jpg' })

  await expect(page).toHaveScreenshot('render-no-create-image-bitmap.png')
})

test('loads a plain jpeg anyway', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  await page.evaluate(testHDRJpegLoaderInBrowser, { file: 'files/plain-jpeg.jpg' })

  await expect(page).toHaveScreenshot('render-plain.png')
})

test('throws with an invalid image', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(testHDRJpegLoaderInBrowser, { file: 'files/invalid_image.png' })
  }

  await expect(shouldThrow).rejects.toThrow(/The source image could not be decoded/)
})

test('throws with a not found image', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(testHDRJpegLoaderInBrowser, { file: 'nope' })
  }

  await expect(shouldThrow).rejects.toThrow(/404/)
})
