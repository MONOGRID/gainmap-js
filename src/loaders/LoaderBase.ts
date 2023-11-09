import {
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  LinearMipMapLinearFilter,
  Loader,
  LoadingManager,
  NoColorSpace,
  RGBAFormat,
  SRGBColorSpace,
  Texture,
  UnsignedByteType,
  UVMapping,
  WebGLRenderer
} from 'three'

import { GainMapDecoderMaterial } from '../materials/GainMapDecoderMaterial'
import { GainMapMetadata } from '../types'
import { QuadRenderer } from '../utils/QuadRenderer'

export class LoaderBase<TUrl = string> extends Loader<QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>, TUrl> {
  private renderer: WebGLRenderer
  /**
   *
   * @param renderer
   * @param manager
   */
  constructor (renderer: WebGLRenderer, manager?: LoadingManager) {
    super(manager)
    this.renderer = renderer
  }

  /**
   * @private
   * @returns
   */
  protected prepareQuadRenderer () {
    // temporary values
    const material = new GainMapDecoderMaterial({
      gainMapMax: [1, 1, 1],
      gainMapMin: [0, 0, 0],
      gamma: [1, 1, 1],
      offsetHdr: [1, 1, 1],
      offsetSdr: [1, 1, 1],
      hdrCapacityMax: 1,
      hdrCapacityMin: 0,
      maxDisplayBoost: 1,
      gainMap: new Texture(),
      sdr: new Texture()
    })

    return new QuadRenderer(
      16,
      16,
      HalfFloatType,
      NoColorSpace,
      material,
      this.renderer
    )
  }

  /**
   *
   * @private
   * @param quadRenderer
   * @param gainMapBuffer
   * @param sdrBuffer
   * @param metadata
   */
  protected async render (quadRenderer: QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>, gainMapBuffer: ArrayBuffer | string, sdrBuffer: ArrayBuffer | string, metadata: GainMapMetadata) {
    const gainMapBlob = new Blob([gainMapBuffer], { type: 'image/jpeg' })
    // TODO: figure out why result.sdr is not usable here, problem is in the libultrahdr-wasm repo
    // we use the original image buffer instead
    const sdrBlob = new Blob([sdrBuffer], { type: 'image/jpeg' })

    const [gainMapImageBitmap, sdrImageBitmap] = await Promise.all([
      createImageBitmap(gainMapBlob, { imageOrientation: 'flipY' }),
      createImageBitmap(sdrBlob, { imageOrientation: 'flipY' })
    ])

    const gainMap = new Texture(gainMapImageBitmap,
      UVMapping,
      ClampToEdgeWrapping,
      ClampToEdgeWrapping,
      LinearFilter,
      LinearMipMapLinearFilter,
      RGBAFormat,
      UnsignedByteType,
      1,
      NoColorSpace
    )

    gainMap.needsUpdate = true

    const sdr = new Texture(sdrImageBitmap,
      UVMapping,
      ClampToEdgeWrapping,
      ClampToEdgeWrapping,
      LinearFilter,
      LinearMipMapLinearFilter,
      RGBAFormat,
      UnsignedByteType,
      1,
      SRGBColorSpace
    )

    sdr.needsUpdate = true

    quadRenderer.width = sdrImageBitmap.width
    quadRenderer.height = sdrImageBitmap.height
    quadRenderer.material.gainMap = gainMap
    quadRenderer.material.sdr = sdr
    quadRenderer.material.gainMapMin = metadata.gainMapMin
    quadRenderer.material.gainMapMax = metadata.gainMapMax
    quadRenderer.material.offsetHdr = metadata.offsetHdr
    quadRenderer.material.offsetSdr = metadata.offsetSdr
    quadRenderer.material.gamma = metadata.gamma
    quadRenderer.material.hdrCapacityMin = metadata.hdrCapacityMin
    quadRenderer.material.hdrCapacityMax = metadata.hdrCapacityMax
    quadRenderer.material.maxDisplayBoost = Math.pow(2, metadata.hdrCapacityMax)
    quadRenderer.material.needsUpdate = true

    quadRenderer.render()
  }
}
