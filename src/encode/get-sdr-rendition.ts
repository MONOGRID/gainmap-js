import {
  DataTexture,
  SRGBColorSpace,
  ToneMapping,
  UnsignedByteType,
  WebGLRenderer
} from 'three'

import { QuadRenderer } from '../core/QuadRenderer'
import { SDRMaterial } from './materials/SDRMaterial'

/**
 * Renders an SDR Representation of an HDR Image
 *
 * @category Encoding Functions
 * @group Encoding Functions
 *
 * @param hdrTexture The HDR image to be rendered
 * @param renderer (optional) WebGLRenderer to use during the rendering, a disposable renderer will be create and destroyed if this is not provided.
 * @param toneMapping (optional) Tone mapping to be applied to the SDR Rendition
 * @throws {Error} if the WebGLRenderer fails to render the SDR image
 */
export const getSDRRendition = (hdrTexture: DataTexture, renderer?: WebGLRenderer, toneMapping?: ToneMapping): InstanceType<typeof QuadRenderer<typeof UnsignedByteType, InstanceType<typeof SDRMaterial>>> => {
  hdrTexture.needsUpdate = true
  const quadRenderer = new QuadRenderer(
    hdrTexture.image.width,
    hdrTexture.image.height,
    UnsignedByteType,
    SRGBColorSpace,
    new SDRMaterial({ map: hdrTexture, toneMapping }),
    renderer
  )
  try {
    quadRenderer.render()
  } catch (e) {
    quadRenderer.disposeOnDemandRenderer()
    throw e
  }
  return quadRenderer
}
