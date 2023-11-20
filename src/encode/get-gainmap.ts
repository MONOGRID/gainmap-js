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

  const quadRenderer = new QuadRenderer(dataTexture.image.width, dataTexture.image.height, UnsignedByteType, LinearSRGBColorSpace, material, renderer)
  try {
    quadRenderer.render()
  } catch (e) {
    quadRenderer.dispose()
    throw e
  }
  return quadRenderer
}
