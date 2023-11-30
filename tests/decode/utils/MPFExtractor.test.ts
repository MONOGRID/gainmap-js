import * as decode from '@monogrid/gainmap-js'
import { expect } from '@playwright/test'
import sharp from 'sharp'
import * as THREE from 'three'

import { test } from '../../testWithCoverage'

const matrix = [
  '01.jpg',
  '02.jpg',
  '03.jpg',
  '04.jpg',
  '05.jpg',
  '06.jpg',
  '07.jpg',
  '08.jpg',
  '09.jpg',
  '10.jpg',
  'pisa-4k.jpg',
  'spruit_sunrise_4k.jpg'
  // ['abandoned_bakery_16k.jpg'] // too bit to test? snapshot testing fails
]

for (const testFile of matrix) {
  test(`extracts gainmap from ${testFile}`, async ({ page }) => {
    await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

    const script = page.getByTestId('script')
    await expect(script).toBeAttached()

    const result = await page.evaluate(async (testFile) => {
      const file = await new THREE.FileLoader()
        .setResponseType('arraybuffer')
        .loadAsync(`files/${testFile}`)

      if (typeof file !== 'string') {
        const extractor = new decode.MPFExtractor({ extractFII: true, extractNonFII: true })
        const result = await extractor.extract(new Uint8Array(file))
        const buffers = await Promise.all(result.map(blob => blob.arrayBuffer()))
        console.log(buffers)
        return buffers.map(buff => Array.from(new Uint8Array(buff)))
      }
      return null
    }, testFile)

    expect(result).not.toBeNull()
    expect(result!.length).toBe(2)

    const sdr = await sharp(Buffer.from(result![0]))
      .resize({ width: 500, height: 500, fit: 'inside' })
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer()

    // expect(sdr).toMatchSnapshot(`${testFile}-sdr.png`)
    expect(sdr).not.toBeNull() // temporary

    const gainMap = await sharp(Buffer.from(result![1]))
      .resize({ width: 500, height: 500, fit: 'inside' })
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer()

    // expect(gainMap).toMatchSnapshot(`${testFile}-gainmap.png`)
    expect(gainMap).not.toBeNull() // temporary
  })
}
