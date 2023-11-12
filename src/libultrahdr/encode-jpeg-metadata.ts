import { type GainMapMetadata } from '../core/types'
import { type CompressedImage } from '../encode/types'
import { getLibrary } from './library'

/**
 * Encapsulates a Gainmap into a single JPEG file (aka: JPEG-R) with the base map
 * as the sdr visualization and the gainMap encoded into a MPF (Multi-Picture Format) tag.
 *
 * @category Encoding
 * @group Encoding
 *
 * @example
 * import { compress, encode, findTextureMinMax } from '@monogrid/gainmap-js'
 * import { encodeJPEGMetadata } from '@monogrid/gainmap-js/libultrahdr'
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
 *   maxContentBoost: Math.max.apply(this, textureMax)
 * })
 *
 * // obtain the RAW RGBA SDR buffer and create an ImageData
 * const sdrImageData = new ImageData(
 *   encodingResult.sdr.toArray(),
 *   encodingResult.sdr.width,
 *   encodingResult.sdr.height
 * )
 * // obtain the RAW RGBA Gain map buffer and create an ImageData
 * const gainMapImageData = new ImageData(
 *   encodingResult.gainMap.toArray(),
 *   encodingResult.gainMap.width,
 *   encodingResult.gainMap.height
 * )
 *
 * // parallel compress the RAW buffers into the specified mimeType
 * const mimeType = 'image/jpeg'
 * const quality = 0.9
 *
 * const [sdr, gainMap] = await Promise.all([
 *   compress({
 *     source: sdrImageData,
 *     mimeType,
 *     quality,
 *     flipY: true // output needs to be flipped
 *   }),
 *   compress({
 *     source: gainMapImageData,
 *     mimeType,
 *     quality,
 *     flipY: true // output needs to be flipped
 *   })
 * ])
 *
 * // obtain the metadata which will be embedded into
 * // and XMP tag inside the final JPEG file
 * const metadata = encodingResult.getMetadata()
 *
 * // embed the compressed images + metadata into a single
 * // JPEG file
 * const jpeg = await encodeJPEGMetadata({
 *   ...encodingResult,
 *   ...metadata,
 *   sdr,
 *   gainMap
 * })
 *
 * // `jpeg` will be an `Uint8Array` which can be saved somewhere
 *
 *
 * @param encodingResult
 * @returns an Uint8Array representing a JPEG-R file
 * @throws {Error} If `encodingResult.sdr.mimeType !== 'image/jpeg'`
 * @throws {Error} If `encodingResult.gainMap.mimeType !== 'image/jpeg'`
 */
export const encodeJPEGMetadata = async (encodingResult: GainMapMetadata & { sdr: CompressedImage, gainMap: CompressedImage }) => {
  const lib = await getLibrary()

  if (encodingResult.sdr.mimeType !== 'image/jpeg') throw new Error('This function expects an SDR image compressed in jpeg')
  if (encodingResult.gainMap.mimeType !== 'image/jpeg') throw new Error('This function expects a GainMap image compressed in jpeg')

  return lib.appendGainMap(
    encodingResult.sdr.width, encodingResult.sdr.height,
    encodingResult.sdr.data, encodingResult.sdr.data.length,
    encodingResult.gainMap.data, encodingResult.gainMap.data.length,
    encodingResult.gainMapMax.reduce((p, n) => p + n, 0) / encodingResult.gainMapMax.length,
    encodingResult.gainMapMin.reduce((p, n) => p + n, 0) / encodingResult.gainMapMin.length,
    encodingResult.gamma.reduce((p, n) => p + n, 0) / encodingResult.gamma.length,
    encodingResult.offsetSdr.reduce((p, n) => p + n, 0) / encodingResult.offsetSdr.length,
    encodingResult.offsetHdr.reduce((p, n) => p + n, 0) / encodingResult.offsetHdr.length,
    encodingResult.hdrCapacityMin,
    encodingResult.hdrCapacityMax
  ) as Uint8Array
}
