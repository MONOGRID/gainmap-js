import { encodeAndCompress, findTextureMinMax } from '@monogrid/gainmap-js/encode'
import { ACESFilmicToneMapping } from 'three'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
/**
 *
 * @param {string} url
 * @param {'image/jpeg' | 'image/webp' | 'image/png'} mimeType
 * @param {number} quality
 * @param {import('three').ToneMapping} toneMapping
 * @returns
 */
// @ts-expect-error global
window.encodeAndCompress = async (url, mimeType = 'image/jpeg', quality = 0.9, toneMapping = ACESFilmicToneMapping) => {
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
    mimeType,
    quality,
    flipY: loader instanceof EXRLoader,
    maxContentBoost: Math.max.apply(this, textureMax),
    toneMapping
  })

  return {
    ...result,
    gainMap: {
      ...result.gainMap,
      // Uint8Arrays can't be transferred outside puppeteer
      data: Array.from(result.gainMap.data)
    },
    sdr: {
      ...result.sdr,
      // Uint8Arrays can't be transferred outside puppeteer
      data: Array.from(result.sdr.data)
    },
    textureMax
  }
}
