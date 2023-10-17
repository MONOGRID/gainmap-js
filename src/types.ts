import { DataTexture, ToneMapping, WebGLRenderer } from 'three'
import { EXR } from 'three/examples/jsm/loaders/EXRLoader'
import { LogLuv } from 'three/examples/jsm/loaders/LogLuvLoader'
import { RGBE } from 'three/examples/jsm/loaders/RGBELoader'

export type GainMapMetadata = {
  /**
   * This is the gamma to apply to the stored map values.
   */
  mapGamma: number
  /**
   * This is log2 of the minimum display boost value for which the map is applied at all.
   * This value also affects how much to apply the gain map based on the display boost.
   * Must be 0.0 or greater.
   */
  hdrCapacityMin: [number, number, number]
  /**
   * Stores the value of hdr_capacity_max. This is log2 of the maximum display boost value for which the map is applied completely.
   * This value also affects how much to apply the gain map based on the display boost.
   * Must be greater than hdrCapacityMin.
   * Required.
   */
  hdrCapacityMax: [number, number, number]
  /**
   * This is the offset to apply to the SDR pixel values during gain map generation and application
   */
  offsetSdr: number
  /**
   * This is the offset to apply to the HDR pixel values during gain map generation and application.
   */
  offsetHdr: number
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
  /**
   * The maximum available boost supported by a display, at a given point in time.
   * This value can change over time based on device settings and other factors,
   * such as ambient light conditions, or how many bright pixels are on the screen.
   */
  maxDisplayBoost: [number, number, number]
}

export type EncodeParameters = {
  image: EXR | RGBE | LogLuv | DataTexture,
  outMimeType?: 'image/png' | 'image/jpeg' | 'image/webp'
  outQuality?: number
  renderer?: WebGLRenderer,
  maxContentBoost?: number
  minContentBoost?: number
  mapGamma?: number
  sdrToneMapping?: ToneMapping,
  flipY?: boolean
}

export type EncodeBuffersParameters = {
  sdr: Uint8Array | Uint8ClampedArray
  hdr: Uint8Array | Uint8ClampedArray | Uint16Array | Float32Array
  width: number
  height: number
  minContentBoost?: number
  maxContentBoost?: number
  mapGamma?: number
}

export type EncodeMimetypeParameters = {
  source: Uint8Array | Uint8ClampedArray | ImageData
  sourceMimeType?: string
  outMimeType: 'image/png' | 'image/jpeg' | 'image/webp'
  outQuality?: number,
  flipY?: boolean
}

export type DecodeParameters = {
  sdr: ImageBitmap
  gainMap: ImageBitmap
  renderer?: WebGLRenderer,
  decodeAsRenderTarget?: undefined | false
 } & GainMapMetadata

export type DecodeAsRenderTargetParameters = Omit<DecodeParameters, 'decodeAsRenderTarget'> & {
  decodeAsRenderTarget: true
 }
