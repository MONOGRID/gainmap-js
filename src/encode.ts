import { compress } from './encode-utils/compress'
import { getGainMap } from './encode-utils/get-gainmap'
import { getSDRRendition } from './encode-utils/get-sdr-rendition'
import { CompressedImage, EncodingParametersBase, EncodingParametersWithCompression, GainMapMetadata } from './types'
import { getDataTexture } from './utils/get-data-texture'

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
 * // * dispose the WebGLRenderer
 *
 * const gainmap = await encode({image})
 *
 * @param params Encoding Paramaters
 * @returns
 */
export const encode = (params: EncodingParametersBase) => {
  const { image, renderer } = params

  const dataTexture = getDataTexture(image)

  const sdr = getSDRRendition(dataTexture, renderer, params.toneMapping)

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
    getMetadata: () => {
      const meta: GainMapMetadata = {
        gainMapMax: gainMapRenderer.material.gainMapMax,
        gainMapMin: gainMapRenderer.material.gainMapMin,
        gamma: gainMapRenderer.material.gamma,
        hdrCapacityMax: gainMapRenderer.material.hdrCapacityMax,
        hdrCapacityMin: gainMapRenderer.material.hdrCapacityMin,
        offsetHdr: gainMapRenderer.material.offsetHdr,
        offsetSdr: gainMapRenderer.material.offsetSdr
      }
      return meta
    }
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
export const encodeAndCompress = async (params: EncodingParametersWithCompression) => {
  const encodingResult = encode(params)

  const { mimeType, quality, flipY, withWorker } = params

  let compressResult: [CompressedImage, CompressedImage]

  let rawSDR: Uint8ClampedArray
  let rawGainMap: Uint8ClampedArray

  const sdrImageData = new ImageData(encodingResult.sdr.toArray(), encodingResult.sdr.width, encodingResult.sdr.height)
  const gainMapImageData = new ImageData(encodingResult.gainMap.toArray(), encodingResult.gainMap.width, encodingResult.gainMap.height)

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

  encodingResult.sdr.dispose()
  encodingResult.gainMap.dispose()

  return {
    ...encodingResult,
    ...encodingResult.getMetadata(),
    sdr: compressResult[0],
    gainMap: compressResult[1],
    rawSDR,
    rawGainMap
  }
}
