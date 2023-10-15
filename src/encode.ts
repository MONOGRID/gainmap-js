import {
  ACESFilmicToneMapping,
  DataTexture,
  LinearFilter,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
  UVMapping,
  WebGLRenderer
} from 'three'
import { EXR } from 'three/examples/jsm/loaders/EXRLoader'
import { LogLuv } from 'three/examples/jsm/loaders/LogLuvLoader'
import { RGBE } from 'three/examples/jsm/loaders/RGBELoader'

import { encodeBuffers } from './encode-utils/encode-buffers'
import { convertImageBufferToMimetype } from './encode-utils/encode-mimetype'
import { renderSDR } from './encode-utils/render-sdr'
/**
 *
 * @param image
 * @param outMimeType
 * @param quality
 * @param renderer
 */
export const encode = async (image: EXR | RGBE | LogLuv | DataTexture, outMimeType: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/webp', quality = 0.95, renderer?: WebGLRenderer) => {
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
  const rawSdr = renderSDR(tex, ACESFilmicToneMapping, renderer)

  // console.log('[encodeGainMap]: encoding gainmap on worker')
  const encodingResult = await encodeBuffers({
    hdr: imageData,
    sdr: rawSdr,
    width: imageWidth,
    height: imageHeight
  })

  // console.log('[encodeGainMap]: encoding images with worker')
  const [sdr, gainMap] = await Promise.all([
    convertImageBufferToMimetype({
      source: new ImageData(rawSdr, imageWidth, imageHeight),
      outMimeType,
      quality
    }),
    convertImageBufferToMimetype({
      source: new ImageData(encodingResult.gainMap, imageWidth, imageHeight),
      outMimeType,
      quality
    })
  ])

  return {
    ...encodingResult,
    sdr,
    gainMap
  }
}
