import { expect } from '@playwright/test'
import sharp from 'sharp'

import { test } from '../../testWithCoverage'
import { testMPFExtractorInBrowser } from './MPFExtractor'

const matrix = [
  '01.jpg'
  // '02.jpg',
  // '03.jpg',
  // '04.jpg',
  // '05.jpg',
  // '06.jpg',
  // '07.jpg',
  // '08.jpg',
  // '09.jpg',
  // '10.jpg',
  // 'pisa-4k.jpg',
  // 'spruit_sunrise_4k.jpg'
  // 'abandoned_bakery_16k.jpg' // too bit to test? snapshot testing fails
]

for (const testFile of matrix) {
  test(`extracts gainmap from ${testFile}`, async ({ page }) => {
    await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

    const script = page.getByTestId('script')
    await expect(script).toBeAttached()

    const result = await page.evaluate(testMPFExtractorInBrowser, `files/${testFile}`)

    expect(result).not.toBeNull()
    expect(result.length).toBe(2)

    const sdr = await sharp(Buffer.from(result[0]))
      .resize({ width: 500, height: 500, fit: 'inside' })
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer()

    expect(sdr).not.toBeNull() // temporary
    expect(sdr).toMatchSnapshot(`${testFile}-sdr.png`)

    const gainMap = await sharp(Buffer.from(result[1]))
      .resize({ width: 500, height: 500, fit: 'inside' })
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer()

    expect(gainMap).not.toBeNull() // temporary
    expect(gainMap).toMatchSnapshot(`${testFile}-gainmap.png`)
  })
}

test('throw when given a plain jpeg', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(testMPFExtractorInBrowser, 'files/plain-jpeg.jpg')
  }

  await expect(shouldThrow).rejects.toThrow(/Not a valid marker at offset/)
})

test('throw when given an invalid jpeg', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(testMPFExtractorInBrowser, 'files/invalid_image.png')
  }

  await expect(shouldThrow).rejects.toThrow(/Not a valid jpeg/)
})

// test('extracts an unrelated mpf image', async ({ page }) => {
//   await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

//   const script = page.getByTestId('script')
//   await expect(script).toBeAttached()

//   const result = await page.evaluate(testMPFExtractorInBrowser, 'files/340_AppleiPhoneXSMax_IMG_E7156.jpg')

//   expect(result).not.toBeNull()
//   expect(result.length).toBe(2)
// })
