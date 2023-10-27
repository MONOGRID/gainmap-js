import {
  DataTexture,
  LinearFilter,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
  UVMapping
} from 'three'

import { compress } from './encode-utils/compress'
import { encodeBuffers } from './encode-utils/encode-buffers'
import { renderSDR } from './encode-utils/render-sdr'
import { CompressedEncodingResult, CompressedImage, EncodingParametersBase, EncodingParametersWithCompression, HDRRawImageBuffer, RawEncodingResult } from './types'

export { compress, encodeBuffers, renderSDR }
/**
 * Encodes a Gainmap starting from an HDR file.
 *
 * Can optionally use a WebWorker to offload the encoding process to the worker
 *
 * @category Encoding Functions
 * @group Encoding Functions
 * @example
 * import { encode } from 'gainmap-js'
 * import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader'
 *
 * const loader = new EXRLoader()
 * const image = await loader.loadAsync('image.exr')
 * // This will:
 * // * create a WebGLRenderer
 * // * Render the Gainmap
 * // * not use a worker
 * // * dispose the WebGLRenderer
 *
 * const gainmap = await encode({image})
 *
 * @param params Encoding Paramaters
 * @returns
 */
export const encode = async (params: EncodingParametersBase): Promise<RawEncodingResult> => {
  const { image, renderer, gamma, maxContentBoost, minContentBoost, withWorker } = params

  let dataTexture: DataTexture
  let hdrRawData: HDRRawImageBuffer
  let width: number
  let height: number

  if (image instanceof DataTexture) {
    dataTexture = image
    if (dataTexture.image.data instanceof Uint16Array || dataTexture.image.data instanceof Float32Array) {
      hdrRawData = dataTexture.image.data
      width = dataTexture.image.width
      height = dataTexture.image.height
    } else {
      throw new Error('Provided DataTexture is not HDR')
    }
  } else {
    hdrRawData = image.data
    width = image.width
    height = image.height
    dataTexture = new DataTexture(
      image.data,
      image.width,
      image.height,
      'format' in image ? image.format : RGBAFormat,
      image.type,
      UVMapping,
      RepeatWrapping,
      RepeatWrapping,
      LinearFilter,
      LinearFilter,
      16,
      'colorSpace' in image && image.colorSpace === 'srgb' ? image.colorSpace : NoColorSpace
    )
  }

  let sdrRawData = renderSDR(dataTexture, renderer)

  let encodingResult: Awaited<ReturnType<typeof encodeBuffers>>
  if (withWorker) {
    const res = await withWorker.encodeGainmapBuffers({
      hdr: hdrRawData,
      sdr: sdrRawData,
      width,
      height,
      gamma,
      maxContentBoost,
      minContentBoost
    })
    // reassign back transferables
    hdrRawData = res.hdr
    sdrRawData = res.sdr
    encodingResult = res
  } else {
    encodingResult = await encodeBuffers({
      hdr: hdrRawData,
      sdr: sdrRawData,
      width,
      height,
      gamma,
      maxContentBoost,
      minContentBoost
    })
  }
  return {
    ...encodingResult,
    sdr: sdrRawData,
    hdr: { data: hdrRawData, width, height }
  }
}

/**
 * Encodes a Gainmap starting from an HDR file into compressed file formats (`image/jpeg`, `image/webp` or `image/png`).
 *
 * Uses {@link encode} internally, then pipes the results to {@link compress}.
 *
 * @category Encoding Functions
 * @group Encoding Functions
 * @example
 *
 * @param params Encoding Paramaters
 * @throws {Error} if the browser does not support [createImageBitmap](https://caniuse.com/createimagebitmap)
 */
export const encodeAndCompress = async (params: EncodingParametersWithCompression): Promise<CompressedEncodingResult> => {
  const encodingResult = await encode(params)

  const { mimeType, quality, flipY, withWorker } = params

  let compressResult: [CompressedImage, CompressedImage]

  let rawSDR: Uint8ClampedArray
  let rawGainMap: Uint8ClampedArray

  const sdrImageData = new ImageData(encodingResult.sdr, encodingResult.hdr.width, encodingResult.hdr.height)
  const gainMapImageData = new ImageData(encodingResult.gainMap, encodingResult.hdr.width, encodingResult.hdr.height)

  if (withWorker) {
    const workerResult = await Promise.all([
      withWorker.compress({
        source: sdrImageData,
        mimeType,
        quality,
        flipY
      }),
      withWorker.compress({
        source: gainMapImageData,
        mimeType,
        quality,
        flipY
      })
    ])
    compressResult = workerResult
    rawSDR = workerResult[0].source
    rawGainMap = workerResult[1].source
  } else {
    compressResult = await Promise.all([
      compress({
        source: sdrImageData,
        mimeType,
        quality,
        flipY
      }),
      compress({
        source: gainMapImageData,
        mimeType,
        quality,
        flipY
      })
    ])
    rawSDR = sdrImageData.data
    rawGainMap = gainMapImageData.data
  }

  return {
    ...encodingResult,
    sdr: compressResult[0],
    gainMap: compressResult[1],
    rawSDR,
    rawGainMap
  }
}
