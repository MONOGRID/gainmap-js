import { findTextureMinMax } from '@monogrid/gainmap-js/encode'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

/**
 *
 * @param {string} url
 * @returns
 */
// @ts-expect-error global
window.findTextureMinMax = async (url) => {
  /** @type {EXRLoader | RGBELoader} */
  let loader
  if (url.indexOf('.exr') !== -1) loader = new EXRLoader()
  else if (url.indexOf('.hdr') !== -1) loader = new RGBELoader()
  else throw new Error('unknown hdr format')

  const image = await loader.loadAsync(`https://local/${url}`)

  return {
    max: findTextureMinMax(image),
    min: findTextureMinMax(image, 'min')
  }
}
