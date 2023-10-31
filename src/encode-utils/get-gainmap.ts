import {
  NoColorSpace,
  UnsignedByteType
} from 'three'

import { GainMapEncoderMaterial } from '../materials/GainMapEncoderMaterial'
import { EncodingParametersBase } from '../types'
import { getDataTexture } from '../utils/get-data-texture'
import { QuadRenderer } from '../utils/QuadRenderer'
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

  const quadRenderer = new QuadRenderer(dataTexture.image.width, dataTexture.image.height, UnsignedByteType, NoColorSpace, material, renderer)
  quadRenderer.render()
  return quadRenderer
}
