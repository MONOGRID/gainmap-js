import { encodeAndCompress, findTextureMinMax } from '@monogrid/gainmap-js/encode'
import { encodeJPEGMetadata } from '@monogrid/gainmap-js/libultrahdr'
import { ACESFilmicToneMapping } from 'three'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
/**
 *
 * @param {string} url
 * @param {number} quality
 * @param {import('three').ToneMapping} toneMapping
 * @returns
 */
// @ts-expect-error global

window.encodeJPEGMetadata = async (url, quality = 0.9, toneMapping = ACESFilmicToneMapping) => {
  /** @type {EXRLoader | RGBELoader} */
  let loader
  if (url.indexOf('.exr') !== -1) loader = new EXRLoader()
  else if (url.indexOf('.hdr') !== -1) loader = new RGBELoader()
  else throw new Error('unknown hdr format')

  const image = await loader.loadAsync(`https://local/${url}`)
  image.flipY = false

  const textureMax = findTextureMinMax(image)

  const result = await encodeAndCompress({
    image,
    mimeType: 'image/jpeg',
    quality,
    flipY: loader instanceof EXRLoader,
    maxContentBoost: Math.max.apply(this, textureMax),
    toneMapping
  })

  const jpeg = await encodeJPEGMetadata(result)
  // Uint8Arrays can't be transferred outside puppeteer
  return Array.from(jpeg)
}
