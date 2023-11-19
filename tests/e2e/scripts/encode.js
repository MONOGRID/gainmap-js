import { encode, findTextureMinMax } from '@monogrid/gainmap-js/encode'
import { ACESFilmicToneMapping } from 'three'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

/**
 *
 * @param {string} url
 * @param {import('three').ToneMapping} toneMapping
 * @returns
 */
// @ts-expect-error global
window.encode = async (url, toneMapping = ACESFilmicToneMapping) => {
  /** @type {EXRLoader | RGBELoader} */
  let loader
  if (url.indexOf('.exr') !== -1) loader = new EXRLoader()
  else if (url.indexOf('.hdr') !== -1) loader = new RGBELoader()
  else throw new Error('unknown hdr format')

  const image = await loader.loadAsync(`https://local/${url}`)
  image.flipY = url.indexOf('.exr') !== -1

  const textureMax = findTextureMinMax(image)

  const result = encode({
    image,
    maxContentBoost: Math.max.apply(this, textureMax),
    toneMapping
  })
  return {
    sdr: {
      width: result.sdr.width,
      height: result.sdr.height,
      // Uint8Arrays can't be transferred outside puppeteer
      data: Array.from(result.sdr.toArray())
    },
    gainMap: {
      width: result.gainMap.width,
      height: result.gainMap.height,
      // Uint8Arrays can't be transferred outside puppeteer
      data: Array.from(result.gainMap.toArray())
    }
  }
}
