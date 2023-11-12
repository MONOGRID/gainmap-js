import { type Texture, type WebGLRenderer } from 'three'

import { type GainMapMetadata } from '../core/types'

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
   *
   * Non Logarithmic space
   */
  maxDisplayBoost: number
}
/**
 * @category Decoding
 * @group Decoding
 */
export type DecodeParameters = {
  /**
   * An Texture containing the SDR Rendition
   */
  sdr: Texture
  /**
   * An Texture containing the GainMap recovery image
   */
  gainMap: Texture
  /**
   * WebGLRenderer used to decode the GainMap
   */
  renderer?: WebGLRenderer

} & GainmapDecodingParameters & GainMapMetadata
