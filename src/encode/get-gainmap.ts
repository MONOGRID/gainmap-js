import {
  LinearSRGBColorSpace,
  UnsignedByteType
} from 'three'

import { getDataTexture } from '../core/get-data-texture'
import { QuadRenderer } from '../core/QuadRenderer'
import { GainMapEncoderMaterial } from './materials/GainMapEncoderMaterial'
import { EncodingParametersBase } from './types'
/**
 *
 * @param params
 * @returns
 * @deprecated Will be removed in v4.0.0. Use `GainMapEncoderNode` from `@monogrid/gainmap-js/encode/webgpu` with `WebGPURenderer` (which also has a WebGL2 backend) instead: it is **not a drop-in replacement**, it returns live TSL texture nodes, read back asynchronously, see the [migration guide](https://github.com/MONOGRID/gainmap-js#migrating-to-v400).
 *
 * @category Encoding Functions
 * @group Encoding Functions
 */
export const getGainMap = (params: { sdr: InstanceType<typeof QuadRenderer> } & EncodingParametersBase) => {
  const { image, sdr, renderer } = params

  const dataTexture = getDataTexture(image)

  const material = new GainMapEncoderMaterial({
    ...params,
    sdr: sdr.renderTarget.texture,
    hdr: dataTexture
  })

  const quadRenderer = new QuadRenderer({
    width: dataTexture.image.width,
    height: dataTexture.image.height,
    type: UnsignedByteType,
    colorSpace: LinearSRGBColorSpace,
    material,
    renderer,
    renderTargetOptions: params.renderTargetOptions
  })
  try {
    quadRenderer.render()
  } catch (e) {
    quadRenderer.disposeOnDemandRenderer()
    throw e
  }
  return quadRenderer
}
