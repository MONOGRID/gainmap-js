import { DataTexture, WebGLRenderer } from 'three'
import { EXR } from 'three/examples/jsm/loaders/EXRLoader'
import { LogLuv } from 'three/examples/jsm/loaders/LogLuvLoader'
import { RGBE } from 'three/examples/jsm/loaders/RGBELoader'

import { WorkerInterfaceImplementation } from './worker/worker-types'

export type GainMapMetadata = {
  /**
   * This is the gamma to apply to the stored map values.
   */
  gamma: [number, number, number]
  /**
   * This is log2 of the minimum display boost value for which the map is applied at all.
   * This value also affects how much to apply the gain map based on the display boost.
   * Must be 0.0 or greater.
   */
  hdrCapacityMin: number
  /**
   * Stores the value of hdr_capacity_max. This is log2 of the maximum display boost value for which the map is applied completely.
   * This value also affects how much to apply the gain map based on the display boost.
   * Must be greater than hdrCapacityMin.
   * Required.
   */
  hdrCapacityMax: number
  /**
   * This is the offset to apply to the SDR pixel values during gain map generation and application
   */
  offsetSdr: [number, number, number]
  /**
   * This is the offset to apply to the HDR pixel values during gain map generation and application.
   */
  offsetHdr: [number, number, number]
  /**
   * This is log2 of min content boost, which is the minimum allowed ratio of
   * the linear luminance for the target HDR rendition relative to
   * (divided by) that of the SDR image, at a given pixel.
   */
  gainMapMin: [number, number, number]
  /**
   * This is log2 of max content boost, which is the maximum allowed ratio of
   * the linear luminance for the Target HDR rendition relative to
   * (divided by) that of the SDR image, at a given pixel.
   */
  gainMapMax: [number, number, number]

}
/**
 * Paramaters used to Encode a GainMap
 */
export type EncodeParametersBase = {
  /**
   * Input image for encoding, must be an HDR image
   */
  image: EXR | RGBE | LogLuv | DataTexture,
  /**
   * Optional WebGLRenderer, will be created and destroyed on demand
   * if not provided.
   */
  renderer?: WebGLRenderer,
  /**
   * This value lets the content creator constrain how much brighter an image can get, when shown on an HDR display, relative to the SDR rendition.
   *
   * This value is a constant for a particular image. For example, if the value is four, then for any given pixel, the linear luminance of the displayed HDR rendition must be, at the most, 4x the linear luminance of the SDR rendition. In practice, this means that the brighter parts of the scene can be shown up to 4x brighter.
   *
   * In practice, this value is typically greater than 1.0.
   *
   * Always greater than or equal to Min content boost.
   */
  maxContentBoost?: number
  /**
   * This value lets the content creator constrain how much darker an image can get, when shown on an HDR display, relative to the SDR rendition. This value is a constant for a particular image.
   *
   * If, for example, the value is 0.5, then for any given pixel, the linear luminance of the displayed HDR rendition must be (at the least) 0.5x the linear luminance of the SDR rendition.
   *
   * In practice, this value is typically equal to or just less than 1.0.
   *
   * Always less than or equal to Max content boost.
   */
  minContentBoost?: number
  /**
   * This is the gamma to apply to the stored map values.
   *
   * Typically you can use a gamma of 1.0.
   *
   * You can use a different value if your gain map has a very uneven distribution of log_recovery(x, y) values.
   *
   * For example, this might apply if a gain map has a lot of detail just above SDR range (represented as small log_recovery(x, y) values), and a very large map_max_log2 for the top end of the HDR rendition's desired brightness (represented by large log_recovery(x, y) values). In this case, you can use a map_gamma higher than 1.0 so that recovery(x, y) can precisely encode the detail in both the low end and high end of log_recovery(x, y).
   */
  gamma?: [number, number, number]
  /**
   * Encodes the Gainmap using a Web Worker
   */
  withWorker?: WorkerInterfaceImplementation
}
/**
 * Additional parameters to encode a GainMap compressed with a mimeType
 */
export type EncodeParametersWithMimetype = EncodeParametersBase & {
  /**
   * The mimeType of the output
   */
  outMimeType: 'image/png' | 'image/jpeg' | 'image/webp'
  /**
   * Encoding quality [0-1]
   */
  outQuality?: number
  /**
   * FlipY of the encoding process
   */
  flipY?: boolean
}
/**
 *
 */
export type EncodeParameters = EncodeParametersBase | EncodeParametersWithMimetype
/**
 *
 */
export type GainmapEncodingResult = {
  /**
   * Buffer containing an encoded image with a mimeType
   */
  sdr: {
    data: Uint8Array
    width: number
    height: number
  }
  /**
   * Original HDR RAW RGBA Data passed back
   */
  hdr: {
    data: Uint8Array
    width: number
    height: number
  }
  /**
   * Buffer containing an encoded image with a mimeType
   */
  gainMap: {
    data: Uint8Array
    width: number
    height: number
  }
} & GainMapMetadata
/**
 *
 */
export type GainmapRawEncodingResult = {
  /**
   * RAW RGBA data
   */
  sdr: Uint8ClampedArray
  /**
   * RAW RGBA data
   */
  gainMap: Uint8ClampedArray
  /**
   * Original HDR RAW RGBA Data passed back
   */
  hdr: {
    data: Uint8Array
    width: number
    height: number
  }
} & GainMapMetadata
/**
 *
 */
export type EncodeBuffersParameters = {
  sdr: Uint8ClampedArray
  hdr: Uint8Array | Uint8ClampedArray | Uint16Array | Float32Array
  width: number
  height: number
  minContentBoost?: number
  maxContentBoost?: number
  gamma?: [number, number, number]
}

export type EncodeMimetypeParameters = {
  outMimeType: 'image/png' | 'image/jpeg' | 'image/webp'
  outQuality?: number,
  flipY?: boolean
} & ({
  /**
   * RAW RGBA Image Data
   */
  source: ImageData
} | {
  /**
   * Encoded Image Data with a mimeType
   */
  source: Uint8Array | Uint8ClampedArray
  sourceMimeType: string
})

export type DecodeToDataArrayParameters = {
  sdr: ImageBitmap
  gainMap: ImageBitmap
  renderer?: WebGLRenderer,
  /**
   * The maximum available boost supported by a display, at a given point in time.
   * This value can change over time based on device settings and other factors,
   * such as ambient light conditions, or how many bright pixels are on the screen.
   */
  maxDisplayBoost: number
} & GainMapMetadata

export type DecodeToRenderTargetParameters = Omit<DecodeToDataArrayParameters, 'renderer'> & {
  renderer: WebGLRenderer
}
