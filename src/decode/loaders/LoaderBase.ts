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
import { getHTMLImageFromBlob } from '../utils/get-html-image-from-blob'

export class LoaderBase<TUrl = string> extends Loader<QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>, TUrl> {
  private _renderer: WebGLRenderer
  protected _internalLoadingManager: LoadingManager
  /**
   *
   * @param renderer
   * @param manager
   */
  constructor (renderer: WebGLRenderer, manager?: LoadingManager) {
    super(manager)
    this._renderer = renderer
    this._internalLoadingManager = new LoadingManager()
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
      this._renderer
    )
  }

  /**
 * @private
 * @param quadRenderer
 * @param metadata
 * @param sdrBuffer
 * @param gainMapBuffer
 */
  protected async render (quadRenderer: QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>, metadata: GainMapMetadata, sdrBuffer: ArrayBuffer, gainMapBuffer?: ArrayBuffer) {
    // this is optional, will render a black gain-map if not present
    const gainMapBlob = gainMapBuffer ? new Blob([gainMapBuffer], { type: 'image/jpeg' }) : undefined

    const sdrBlob = new Blob([sdrBuffer], { type: 'image/jpeg' })

    let sdrImage: ImageBitmap | HTMLImageElement
    let gainMapImage: ImageBitmap | HTMLImageElement | undefined

    let needsFlip = false

    if (typeof createImageBitmap === 'undefined') {
      const res = await Promise.all([
        gainMapBlob ? getHTMLImageFromBlob(gainMapBlob) : Promise.resolve(undefined),
        getHTMLImageFromBlob(sdrBlob)
      ])

      gainMapImage = res[0]
      sdrImage = res[1]

      needsFlip = true
    } else {
      const res = await Promise.all([
        gainMapBlob ? createImageBitmap(gainMapBlob, { imageOrientation: 'flipY' }) : Promise.resolve(undefined),
        createImageBitmap(sdrBlob, { imageOrientation: 'flipY' })
      ])

      gainMapImage = res[0]
      sdrImage = res[1]
    }

    const gainMap = new Texture(gainMapImage || new ImageData(2, 2),
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