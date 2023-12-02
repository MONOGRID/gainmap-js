import { getDataTexture } from '../core/get-data-texture'
import { GainMapMetadata } from '../core/types'
import { getGainMap } from './get-gainmap'
import { getSDRRendition } from './get-sdr-rendition'
import { EncodingParametersBase } from './types'

/**
 * Encodes a Gainmap starting from an HDR file.
 *
 * @remarks
 * if you do not pass a `renderer` parameter
 * you must manually dispose the result
 * ```js
 * const encodingResult = await encode({ ... })
 * // do something with the buffers
 * const sdr = encodingResult.sdr.getArray()
 * const gainMap = encodingResult.gainMap.getArray()
 * // after that
 * encodingResult.sdr.dispose()
 * encodingResult.gainMap.dispose()
 * ```
 *
 * @category Encoding Functions
 * @group Encoding Functions
 *
 * @example
 * import { encode, findTextureMinMax } from '@monogrid/gainmap-js'
 * import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
 *
 * // load an HDR file
 * const loader = new EXRLoader()
 * const image = await loader.loadAsync('image.exr')
 *
 * // find RAW RGB Max value of a texture
 * const textureMax = await findTextureMinMax(image)
 *
 * // Encode the gainmap
 * const encodingResult = encode({
 *   image,
 *   // this will encode the full HDR range
 *   maxContentBoost: Math.max.apply(this, textureMax)
 * })
 * // can be re-encoded after changing parameters
 * encodingResult.sdr.material.exposure = 0.9
 * encodingResult.sdr.render()
 * // or
 * encodingResult.gainMap.material.gamma = [1.1, 1.1, 1.1]
 * encodingResult.gainMap.render()
 *
 * // do something with encodingResult.gainMap.toArray()
 * // and encodingResult.sdr.toArray()
 *
 * // renderers must be manually disposed
 * encodingResult.sdr.dispose()
 * encodingResult.gainMap.dispose()
 *
 * @param params Encoding Parameters
 * @returns
 */
export const encode = (params: EncodingParametersBase) => {
  const { image, renderer } = params

  const dataTexture = getDataTexture(image)

  const sdr = getSDRRendition(dataTexture, renderer, params.toneMapping, params.renderTargetOptions)

  const gainMapRenderer = getGainMap({
    ...params,
    image: dataTexture,
    sdr,
    renderer: sdr.renderer // reuse the same (maybe disposable?) renderer
  })

  return {
    sdr,
    gainMap: gainMapRenderer,
    hdr: dataTexture,
    getMetadata: (): GainMapMetadata => {
      return {
        gainMapMax: gainMapRenderer.material.gainMapMax,
        gainMapMin: gainMapRenderer.material.gainMapMin,
        gamma: gainMapRenderer.material.gamma,
        hdrCapacityMax: gainMapRenderer.material.hdrCapacityMax,
        hdrCapacityMin: gainMapRenderer.material.hdrCapacityMin,
        offsetHdr: gainMapRenderer.material.offsetHdr,
        offsetSdr: gainMapRenderer.material.offsetSdr
      }
    }
  }
}
