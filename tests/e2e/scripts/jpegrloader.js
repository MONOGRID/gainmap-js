import { JPEGRLoader } from '@monogrid/gainmap-js'
import { findTextureMinMax } from '@monogrid/gainmap-js/encode'
import { WebGLRenderer } from 'three'

/**
 *
 * @param {string} url
 * @returns
 */
// @ts-expect-error global
window.JPEGRLoader = async (url) => {
  const loader = new JPEGRLoader(new WebGLRenderer())
  const result = await loader.loadAsync(`https://local/${url}`)
  return {
    width: result.width,
    height: result.height,
    data: Array.from(result.toArray()),
    max: findTextureMinMax(result.toDataTexture())
  }
}
