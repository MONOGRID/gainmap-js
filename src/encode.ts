import {
  DataTexture,
  LinearFilter,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
  UVMapping
} from 'three'

import { encodeBuffers } from './encode-utils/encode-buffers'
import { convertImageBufferToMimetype } from './encode-utils/encode-mimetype'
import { renderSDR } from './encode-utils/render-sdr'
import { EncodeParameters, EncodeRawResult } from './types'

export { convertImageBufferToMimetype, encodeBuffers, renderSDR }
/**
 *
 * @param image
 * @param outMimeType
 * @param quality
 * @param renderer
 */
export const encode = async ({ image, outMimeType, outQuality, renderer, gamma, maxContentBoost, minContentBoost, flipY, withWorker }: EncodeParameters) => {
  let tex: DataTexture
  let imageData: Float32Array | Uint16Array | Uint8ClampedArray | Uint8Array
  let imageWidth: number
  let imageHeight: number

  if (image instanceof DataTexture) {
    tex = image
    imageData = tex.image.data
    imageWidth = tex.image.width
    imageHeight = tex.image.height
  } else {
    imageData = image.data
    imageWidth = image.width
    imageHeight = image.height
    tex = new DataTexture(
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

  let rawSdr = renderSDR(tex, renderer)

  let encodingResult: Awaited<ReturnType<typeof encodeBuffers>>
  if (withWorker) {
    const res = await withWorker.encodeGainmapBuffers({
      hdr: imageData,
      sdr: rawSdr,
      width: imageWidth,
      height: imageHeight,
      gamma,
      maxContentBoost,
      minContentBoost
    })
    // reassign back transferables
    imageData = res.hdr
    rawSdr = res.sdr
    encodingResult = res
  } else {
    encodingResult = await encodeBuffers({
      hdr: imageData,
      sdr: rawSdr,
      width: imageWidth,
      height: imageHeight,
      gamma,
      maxContentBoost,
      minContentBoost
    })
  }

  // console.log('[encodeGainMap]: encoding images with worker')
  const [sdr, gainMap] = await Promise.all([
    convertImageBufferToMimetype({
      source: new ImageData(rawSdr, imageWidth, imageHeight),
      outMimeType: outMimeType || 'image/jpeg',
      outQuality,
      flipY
    }),
    convertImageBufferToMimetype({
      source: new ImageData(encodingResult.gainMap, imageWidth, imageHeight),
      outMimeType: outMimeType || 'image/jpeg',
      outQuality,
      flipY
    })
  ])

  return {
    ...encodingResult,
    sdr,
    hdr: { data: imageData, width: imageWidth, height: imageHeight },
    gainMap
  } as EncodeRawResult
}
