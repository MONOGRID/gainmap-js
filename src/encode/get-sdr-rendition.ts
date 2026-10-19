import {
  DataTexture,
  SRGBColorSpace,
  ToneMapping,
  UnsignedByteType,
  WebGLRenderer
} from 'three'

import { QuadRenderer } from '../core/QuadRenderer'
import { QuadRendererTextureOptions } from '../decode'
import { SDRMaterial } from './materials/SDRMaterial'

/**
 * Renders an SDR Representation of an HDR Image
 *
 * @deprecated Will be removed in v4.0.0. Use `SDRRenditionNode` from `@monogrid/gainmap-js/encode/webgpu` with `WebGPURenderer` (which also has a WebGL2 backend) instead: it is **not a drop-in replacement**, it returns live TSL texture nodes, read back asynchronously, see the [migration guide](https://github.com/MONOGRID/gainmap-js#migrating-to-v400).
 *
 * @category Encoding Functions
 * @group Encoding Functions
 *
 * @param hdrTexture The HDR image to be rendered
 * @param renderer (optional) WebGLRenderer to use during the rendering, a disposable renderer will be create and destroyed if this is not provided.
 * @param toneMapping (optional) Tone mapping to be applied to the SDR Rendition
 * @param renderTargetOptions (optional) Options to use when creating the output renderTarget
 * @throws {Error} if the WebGLRenderer fails to render the SDR image
 */
export const getSDRRendition = (hdrTexture: DataTexture, renderer?: WebGLRenderer, toneMapping?: ToneMapping, renderTargetOptions?: QuadRendererTextureOptions): InstanceType<typeof QuadRenderer<typeof UnsignedByteType, InstanceType<typeof SDRMaterial>>> => {
  hdrTexture.needsUpdate = true
  const quadRenderer = new QuadRenderer({
    width: hdrTexture.image.width,
    height: hdrTexture.image.height,
    type: UnsignedByteType,
    colorSpace: SRGBColorSpace,
    material: new SDRMaterial({ map: hdrTexture, toneMapping }),
    renderer,
    renderTargetOptions
  })
  try {
    quadRenderer.render()
  } catch (e) {
    quadRenderer.disposeOnDemandRenderer()
    throw e
  }
  return quadRenderer
}
