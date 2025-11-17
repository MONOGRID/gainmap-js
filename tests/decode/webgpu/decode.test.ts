import { ConsoleMessage, expect } from '@playwright/test'

import { test } from '../../testWithCoverage'
import { decodeInBrowserWebGPU } from './decode'

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

test('decodes from jpeg (WebGPU)', async ({ page, browserName }) => {
  // Skip test if WebGPU is not supported
  test.skip(browserName === 'firefox' || browserName === 'webkit', 'WebGPU not fully supported in Firefox and WebKit')

  await page.goto('/tests/testbed-webgpu.html', { waitUntil: 'networkidle' })

  const logs: string[] = []
  page.on('console', (m: ConsoleMessage) => {
    logs.push(m.text())
  })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const result = await page.evaluate(decodeInBrowserWebGPU, { file: 'files/spruit_sunrise_4k.jpg' })

  expect(JSON.stringify(result.materialValues)).toMatchSnapshot({ name: 'material-values.json' })

  // test conversion to appropriate colorspace happens
  expect(logs.find(m => m.match(/Gainmap Colorspace needs to be/gi))).toBeTruthy()
  expect(logs.find(m => m.match(/SDR Colorspace needs to be/gi))).toBeTruthy()

  await expect(page).toHaveScreenshot('render.png')
})

test('throws error when renderer is not provided (WebGPU)', async ({ page, browserName }) => {
  // Skip test if WebGPU is not supported
  test.skip(browserName === 'firefox' || browserName === 'webkit', 'WebGPU not fully supported in Firefox and WebKit')

  await page.goto('/tests/testbed-webgpu.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(async () => {
      const decode = await import('@monogrid/gainmap-js/webgpu')
      const THREE = await import('three/webgpu')

      // fetch a JPEG image containing a gainmap as ArrayBuffer
      const file = await fetch('files/spruit_sunrise_4k.jpg')
      const fileBuffer = await file.arrayBuffer()
      const jpeg = new Uint8Array(fileBuffer)

      // extract data from the JPEG
      const { gainMap: gainMapBuffer, sdr: sdrBuffer, metadata } = await decode.extractGainmapFromJPEG(jpeg)

      // create data blobs
      const gainMapBlob = new Blob([gainMapBuffer], { type: 'image/jpeg' })
      const sdrBlob = new Blob([sdrBuffer], { type: 'image/jpeg' })

      // create ImageBitmap data
      const [gainMapImageBitmap, sdrImageBitmap] = await Promise.all([
        createImageBitmap(gainMapBlob, { imageOrientation: 'flipY' }),
        createImageBitmap(sdrBlob, { imageOrientation: 'flipY' })
      ])

      const gainMap = new THREE.Texture(gainMapImageBitmap)
      gainMap.needsUpdate = true

      const sdr = new THREE.Texture(sdrImageBitmap)
      sdr.needsUpdate = true

      await decode.decode({
        sdr,
        gainMap,
        // @ts-expect-error - intentionally passing undefined renderer to test error handling
        renderer: undefined,
        maxDisplayBoost: Math.pow(2, metadata.hdrCapacityMax),
        ...metadata
      })
    })
  }

  await expect(shouldThrow).rejects.toThrow(/Renderer is required/)
})
