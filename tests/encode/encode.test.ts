import * as encode from '@monogrid/gainmap-js/encode'
import * as libultrahdr from '@monogrid/gainmap-js/libultrahdr'
import { expect } from '@playwright/test'
import sharp from 'sharp'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'

import { test } from '../testWithCoverage'

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

test('encodes from exr', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const result = await page.evaluate(async (file) => {
    // load an HDR file
    const loader = new EXRLoader()
    const image = await loader.loadAsync(file)

    // find RAW RGB Max value of a texture
    const textureMax = encode.findTextureMinMax(image)

    // Encode the gainmap
    const encodingResult = encode.encode({
      image,
      // this will encode the full HDR range
      maxContentBoost: Math.max.apply(this, textureMax)
    })

    // obtain the RAW RGBA SDR buffer and create an ImageData
    const sdrImageData = new ImageData(encodingResult.sdr.toArray(), encodingResult.sdr.width, encodingResult.sdr.height)
    // obtain the RAW RGBA Gain map buffer and create an ImageData
    const gainMapImageData = new ImageData(encodingResult.gainMap.toArray(), encodingResult.gainMap.width, encodingResult.gainMap.height)

    // parallel compress the RAW buffers into the specified mimeType
    const mimeType = 'image/jpeg'
    const quality = 0.9

    const [sdr, gainMap] = await Promise.all([
      encode.compress({
        source: sdrImageData,
        mimeType,
        quality,
        flipY: true // output needs to be flipped
      }),
      encode.compress({
        source: gainMapImageData,
        mimeType,
        quality,
        flipY: true // output needs to be flipped
      })
    ])

    // obtain the metadata which will be embedded into
    // and XMP tag inside the final JPEG file
    const metadata = encodingResult.getMetadata()

    // embed the compressed images + metadata into a single
    // JPEG file
    const jpeg = await libultrahdr.encodeJPEGMetadata({
      ...encodingResult,
      ...metadata,
      sdr,
      gainMap
    })

    encodingResult.gainMap.dispose()
    encodingResult.sdr.dispose()

    return Array.from(jpeg)
  }, 'files/memorial.exr')

  const resized = await sharp(Buffer.from(result))
    .resize({ width: 500, height: 500, fit: 'inside' })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer()

  expect(resized).toMatchSnapshot('memorial.exr-encode-result.png')
})
