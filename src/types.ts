import { type DataTexture, Texture, type WebGLRenderer } from 'three'
import { type EXR } from 'three/examples/jsm/loaders/EXRLoader'
import { type LogLuv } from 'three/examples/jsm/loaders/LogLuvLoader'
import { type RGBE } from 'three/examples/jsm/loaders/RGBELoader'

import { type WorkerInterfaceImplementation } from './worker/worker-types'
/**
 * This is the Metadata stored in an encoded Gainmap which is used
 * to decode it and return an HDR image
 *
 * @category Gainmap Specifications
 * @group Gainmap Specifications
 */
export type GainMapMetadata = {
  /**
   * This is the gamma to apply to the stored map values.
   * @defaultValue [1, 1, 1]
   * @remarks
   * * Typically you can use a gamma of 1.0.
   * * You can use a different value if your gain map has a very uneven distribution of log_recovery(x, y) values.
   *
   *   For example, this might apply if a gain map has a lot of detail just above SDR range (represented as small log_recovery(x, y) values), and a very large map_max_log2 for the top end of the HDR rendition's desired brightness (represented by large log_recovery(x, y) values). In this case, you can use a map_gamma higher than 1.0 so that recovery(x, y) can precisely encode the detail in both the low end and high end of log_recovery(x, y).
   */
  gamma: [number, number, number]
  /**
   * This is log2 of the minimum display boost value for which the map is applied at all.
   *
   * @remarks
   * * This value also affects how much to apply the gain map based on the display boost.
   * * Must be 0.0 or greater.
   */
  hdrCapacityMin: number
  /**
   * Stores the value of hdr_capacity_max. This is log2 of the maximum display boost value for which the map is applied completely.
   *
   * @remarks
   * * This value also affects how much to apply the gain map based on the display boost.
   * * Must be greater than hdrCapacityMin.
   * * Required.
   */
  hdrCapacityMax: number
  /**
   * This is the offset to apply to the SDR pixel values during gain map generation and application
   * @defaultValue [1/64, 1/64, 1/64]
   */
  offsetSdr: [number, number, number]
  /**
   * This is the offset to apply to the HDR pixel values during gain map generation and application.
   * @defaultValue [1/64, 1/64, 1/64]
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
 * Parameters used by content Creators in order to create a GainMap
 * @category Gainmap Specifications
 * @group Gainmap Specifications
 */
export type GainmapEncodingParameters = {
  /**
   *
   */
  offsetHdr?: [number, number, number]
  /**
   *
   */
  offsetSdr?: [number, number, number]
  /**
   * This value lets the content creator constrain how much darker an image can get, when shown on an HDR display, relative to the SDR rendition. This value is a constant for a particular image.
   * @defaultValue 1
   * @remarks
   * * If, for example, the value is 0.5, then for any given pixel, the linear luminance of the displayed HDR rendition must be (at the least) 0.5x the linear luminance of the SDR rendition.
   * * In practice, this value is typically equal to or just less than 1.0.
   * * Always less than or equal to Max content boost.
   */
  minContentBoost?: number
  /**
   * This value lets the content creator constrain how much brighter an image can get, when shown on an HDR display, relative to the SDR rendition.
   *
   * @remarks
   * * This value is a constant for a particular image. For example, if the value is four, then for any given pixel, the linear luminance of the displayed HDR rendition must be, at the most, 4x the linear luminance of the SDR rendition. In practice, this means that the brighter parts of the scene can be shown up to 4x brighter.
   * * In practice, this value is typically greater than 1.0.
   * * Always greater than or equal to Min content boost.
   */
  maxContentBoost: number
  /**
   * This is the gamma to apply to the stored map values.
   *
   * @defaultValue [1, 1, 1]
   * @remarks
   * * Typically you can use a gamma of 1.0.
   * * You can use a different value if your gain map has a very uneven distribution of log_recovery(x, y) values.
   *   For example, this might apply if a gain map has a lot of detail just above SDR range (represented as small log_recovery(x, y) values), and a very large map_max_log2 for the top end of the HDR rendition's desired brightness (represented by large log_recovery(x, y) values). In this case, you can use a map_gamma higher than 1.0 so that recovery(x, y) can precisely encode the detail in both the low end and high end of log_recovery(x, y).
   */
  gamma?: [number, number, number]
}
/**
 * Parameters for decoding a Gainmap
 *
 * @category Gainmap Specifications
 * @group Gainmap Specifications
 */
export type GainmapDecodingParameters = {
  /**
   * The maximum available boost supported by a display, at a given point in time.
   *
   * @remarks
   * This value can change over time based on device settings and other factors,
   * such as ambient light conditions, or how many bright pixels are on the screen.
   */
    maxDisplayBoost: number
}

/**
 * Paramaters used to Encode a GainMap
 *
 * @category Encoding Parameters
 * @group Encoding Parameters
 */
export type EncodingParametersBase = GainmapEncodingParameters & {
  /**
   * Input image for encoding, must be an HDR image
   */
  image: EXR | RGBE | LogLuv | DataTexture,
  /**
   * Optional WebGLRenderer
   * @remarks
   * will be created and destroyed on demand if not provided.
   */
  renderer?: WebGLRenderer,
}
/**
 * This library can provide gainmap compressed in these mimeTypes
 *
 * @category Compression
 * @group Compression
 */
export type CompressionMimeType = 'image/png' | 'image/jpeg' | 'image/webp'
/**
 * Accepted HDR image buffers, definitions coming from the THREE.js Library types
 *
 * @category General
 * @group General
 */
export type HDRRawImageBuffer = EXR['data'] | RGBE['data'] | LogLuv['data']
/**
 * Raw HDR image data
 *
 * @category General
 * @group General
 */
export type HDRRawImage = {
  data: HDRRawImageBuffer
  width: number
  height: number
}
/**
 * Options for compressing a RAW RGBA image into the specified mimeType
 *
 * @category Compression
 * @group Compression
 */
export type CompressOptions = {
  /**
   * The mimeType of the output
   */
  mimeType: CompressionMimeType
  /**
   * Encoding quality [0-1]
   */
  quality?: number,
  /**
   * FlipY of the encoding process
   */
  flipY?: boolean
}

/**
 * Data structure representing a compressed image with a mimeType
 *
 * @category Compression
 * @group Compression
 */
export type CompressedImage = {
  data: Uint8Array
  mimeType: CompressionMimeType
  width: number
  height: number
}

/**
 * @category Compression
 * @group Compression
 */
export type CompressParameters = CompressOptions & ({
  /**
   * RAW RGBA Image Data
   */
  source: ImageData
} | {
  /**
   * Encoded Image Data with a mimeType
   */
  source: Uint8Array | Uint8ClampedArray
  /**
   * mimeType of the encoded input
   */
  sourceMimeType: string
})

/**
 * Additional parameters to encode a GainMap compressed with a mimeType
 * @category Encoding Parameters
 * @group Encoding Parameters
 */
export type EncodingParametersWithCompression = EncodingParametersBase & CompressOptions & {
  /**
   * Encodes the Gainmap using a Web Worker
   */
  withWorker?: WorkerInterfaceImplementation
}

/**
 * @category Decoding
 * @group Decoding
 */
export type DecodeParameters = {
  /**
   * An ImageBitmap containing the SDR Rendition
   */
  sdr: Texture
  /**
   * An ImageBitmap containing the GainMap recovery image
   */
  gainMap: Texture
  /**
   * WebGLRenderer used to decode the GainMap
   */
  renderer?: WebGLRenderer

} & GainmapDecodingParameters & GainMapMetadata
