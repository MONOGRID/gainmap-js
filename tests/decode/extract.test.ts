import * as decode from '@monogrid/gainmap-js'
import { expect } from '@playwright/test'

import { test } from '../testWithCoverage'

// const matrix = [

test('extracts from a valid jpeg', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const result = await page.evaluate(async () => {
    // fetch a JPEG image containing a gainmap as ArrayBuffer
    const file = await fetch('files/spruit_sunrise_4k.jpg')
    const fileBuffer = await file.arrayBuffer()
    const jpeg = new Uint8Array(fileBuffer)
    return decode.extractGainmapFromJPEG(jpeg)
  })

  expect(result).not.toBeUndefined()
})

test('throws from an invalid jpeg', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(async () => {
      // fetch a JPEG image containing a gainmap as ArrayBuffer
      const file = await fetch('files/plain-jpeg.jpg')
      const fileBuffer = await file.arrayBuffer()
      const jpeg = new Uint8Array(fileBuffer)
      return decode.extractGainmapFromJPEG(jpeg)
    })
  }
  await expect(shouldThrow).rejects.toThrowError(/XMP metadata not found/)
})
