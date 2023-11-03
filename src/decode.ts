import {
  HalfFloatType,
  NoColorSpace,
  SRGBColorSpace
} from 'three'

import { GainMapDecoderMaterial } from './materials/GainMapDecoderMaterial'
import { DecodeParameters } from './types'
import { QuadRenderer } from './utils/QuadRenderer'

/**
 * Decodes a gain map using a WebGLRenderTarget
 *
 * @category Decoding
 * @group Decoding
 * @example
 * import { decode } from '@monogrid/gainmap-js'
 * import { Mesh, MeshBasicMaterial, PlaneGeometry, TextureLoader } from 'three'
 *
 * const loader = new TextureLoader()
 *
 * // load SDR Representation
 * const sdr = await loader.loadAsync('sdr.jpg')
 * // load Gain map recovery image
 * const gainMap = await loader.loadAsync('gainmap.jpg')
 * // load metadata
 * const metadata = await (await fetch('metadata.json')).json()
 *
 * const result = await decode({
 *   sdr,
 *   gainMap,
 *   // this will restore the full HDR range
 *   maxDisplayBoost: Math.pow(2, metadata.hdrCapacityMax),
 *   ...metadata
 * })
 *
 * // result can be used to populate a Texture
 * const mesh = new Mesh(new PlaneGeometry(), new MeshBasicMaterial({ map: result.renderTarget.texture }))
 *
 * @param params
 * @returns
 * @throws {Error} if the WebGLRenderer fails to render the gain map
 */
export const decode = (params: DecodeParameters): InstanceType<typeof QuadRenderer<typeof HalfFloatType, InstanceType<typeof GainMapDecoderMaterial>>> => {
  const { sdr, gainMap, renderer } = params

  if (sdr.colorSpace !== SRGBColorSpace) {
    console.warn('SDR Colorspace needs to be *SRGBColorSpace*, setting it automatically')
    sdr.colorSpace = SRGBColorSpace
  }
  sdr.needsUpdate = true

  if (gainMap.colorSpace !== NoColorSpace) {
    console.warn('Gainmap Colorspace needs to be *NoColorSpace*')
    gainMap.colorSpace = NoColorSpace
  }
  gainMap.needsUpdate = true

  const material = new GainMapDecoderMaterial({
    ...params,
    sdr,
    gainMap
  })

  const quadRenderer = new QuadRenderer(sdr.image.width, sdr.image.height, HalfFloatType, NoColorSpace, material, renderer)
  try {
    quadRenderer.render()
  } catch (e) {
    quadRenderer.dispose()
    throw e
  }
  return quadRenderer
}
