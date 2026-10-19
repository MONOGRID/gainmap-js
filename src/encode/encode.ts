import { warnDeprecated } from '../decode/shared/utils/warn-deprecated'
import { encodeWithoutWarning } from './encode-implementation'
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
 * @deprecated Will be removed in v4.0.0. Use `GainMapEncoder` from `@monogrid/gainmap-js/encode/webgpu` with `WebGPURenderer` (which also has a WebGL2 backend) instead: it is **not a drop-in replacement**, it returns live TSL texture nodes, read back asynchronously, see the [migration guide](https://github.com/MONOGRID/gainmap-js#migrating-to-v400).
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
 * const textureMax = findTextureMinMax(image)
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
  warnDeprecated('encode()', '@monogrid/gainmap-js/encode', 'GainMapEncoder', '@monogrid/gainmap-js/encode/webgpu', 'it returns live TSL texture nodes, read back asynchronously')
  return encodeWithoutWarning(params)
}
