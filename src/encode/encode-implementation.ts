import { getDataTexture } from '../core/get-data-texture'
import { GainMapMetadata } from '../core/types'
import { getGainMap } from './get-gainmap'
import { getSDRRendition } from './get-sdr-rendition'
import { EncodingParametersBase } from './types'

/**
 * `encode()` without the deprecation warning, used by `encodeAndCompress()`
 *
 * @internal
 * @param params
 */
export const encodeWithoutWarning = (params: EncodingParametersBase) => {
  const { image, renderer } = params

  const dataTexture = getDataTexture(image)

  const sdr = getSDRRendition(dataTexture, renderer, params.toneMapping, params.renderTargetOptions)

  const gainMapRenderer = getGainMap({
    ...params,
    image: dataTexture,
    sdr,
    renderer: sdr.renderer // reuse the same (maybe disposable?) renderer
  })

  return {
    sdr,
    gainMap: gainMapRenderer,
    hdr: dataTexture,
    getMetadata: (): GainMapMetadata => {
      return {
        gainMapMax: gainMapRenderer.material.gainMapMax,
        gainMapMin: gainMapRenderer.material.gainMapMin,
        gamma: gainMapRenderer.material.gamma,
        hdrCapacityMax: gainMapRenderer.material.hdrCapacityMax,
        hdrCapacityMin: gainMapRenderer.material.hdrCapacityMin,
        offsetHdr: gainMapRenderer.material.offsetHdr,
        offsetSdr: gainMapRenderer.material.offsetSdr
      }
    }
  }
}
