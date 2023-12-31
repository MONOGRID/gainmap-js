import { expect } from '@playwright/test'
import sharp from 'sharp'

import { test } from '../testWithCoverage'
import { encodeAndCompressInBrowser } from './encode-and-compress'
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

test('encodes and compresses from exr', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const result = await page.evaluate(encodeAndCompressInBrowser, { file: 'files/memorial.exr' })

  const resized = await sharp(Buffer.from(result))
    .resize({ width: 500, height: 500, fit: 'inside' })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer()

  expect(resized).toMatchSnapshot('memorial.exr-encode-result.png')
})

test('encodes and compresses from exr using worker', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const result = await page.evaluate(encodeAndCompressInBrowser, { file: 'files/memorial.exr', withWorker: true })

  const resized = await sharp(Buffer.from(result))
    .resize({ width: 500, height: 500, fit: 'inside' })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer()

  expect(resized).toMatchSnapshot('memorial.exr-encode-result.png')
})
