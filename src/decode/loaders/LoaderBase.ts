import {
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  LinearMipMapLinearFilter,
  LinearSRGBColorSpace,
  Loader,
  LoadingManager,
  RGBAFormat,
  SRGBColorSpace,
  Texture,
  UnsignedByteType,
  UVMapping,
  WebGLRenderer
} from 'three'

import { QuadRenderer } from '../../core/QuadRenderer'
import { type GainMapMetadata } from '../../core/types'
import { GainMapDecoderMaterial } from '../materials/GainMapDecoderMaterial'

/**
 * private function, async get image from blob
 *
 * @param blob
 * @returns
 */
const getImage = (blob: Blob) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = document.createElement('img')
    img.onload = () => { resolve(img) }
    img.onerror = (e) => { reject(e) }
    img.src = URL.createObjectURL(blob)
  })
}

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
      LinearSRGBColorSpace,
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

    const sdrBlob = new Blob([sdrBuffer], { type: 'image/jpeg' })

    let sdrImage: ImageBitmap | HTMLImageElement
    let gainMapImage: ImageBitmap | HTMLImageElement

    let needsFlip = false

    if (typeof createImageBitmap === 'undefined') {
      const res = await Promise.all([
        getImage(gainMapBlob),
        getImage(sdrBlob)
      ])

      gainMapImage = res[0]
      sdrImage = res[1]

      needsFlip = true
    } else {
      const res = await Promise.all([
        createImageBitmap(gainMapBlob, { imageOrientation: 'flipY' }),
        createImageBitmap(sdrBlob, { imageOrientation: 'flipY' })
      ])

      gainMapImage = res[0]
      sdrImage = res[1]
    }

    const gainMap = new Texture(gainMapImage,
      UVMapping,
      ClampToEdgeWrapping,
      ClampToEdgeWrapping,
      LinearFilter,
      LinearMipMapLinearFilter,
      RGBAFormat,
      UnsignedByteType,
      1,
      LinearSRGBColorSpace
    )

    gainMap.flipY = needsFlip
    gainMap.needsUpdate = true

    const sdr = new Texture(sdrImage,
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

    sdr.flipY = needsFlip
    sdr.needsUpdate = true

    quadRenderer.width = sdrImage.width
    quadRenderer.height = sdrImage.height
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
