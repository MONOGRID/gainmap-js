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
import { type GainMapMetadata, QuadRendererTextureOptions } from '../../core/types'
import { GainMapDecoderMaterial } from '../materials/GainMapDecoderMaterial'
import { getHTMLImageFromBlob } from '../utils/get-html-image-from-blob'

export class LoaderBase<TUrl = string> extends Loader<QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>, TUrl> {
  private _renderer?: WebGLRenderer
  private _renderTargetOptions?: QuadRendererTextureOptions
  /**
   * @private
   */
  protected _internalLoadingManager: LoadingManager
  /**
   *
   * @param renderer
   * @param manager
   */
  constructor (renderer?: WebGLRenderer, manager?: LoadingManager) {
    super(manager)
    if (renderer) this._renderer = renderer
    this._internalLoadingManager = new LoadingManager()
  }

  /**
   * Specify the renderer to use when rendering the gain map
   *
   * @param renderer
   * @returns
   */
  public setRenderer (renderer: WebGLRenderer) {
    this._renderer = renderer
    return this
  }

  /**
   * Specify the renderTarget options to use when rendering the gain map
   *
   * @param options
   * @returns
   */
  public setRenderTargetOptions (options: QuadRendererTextureOptions) {
    this._renderTargetOptions = options
    return this
  }

  /**
   * @private
   * @returns
   */
  protected prepareQuadRenderer () {
    if (!this._renderer) console.warn('WARNING: An existing WebGL Renderer was not passed to this Loader constructor or in setRenderer, the result of this Loader will need to be converted to a Data Texture with toDataTexture() before you can use it in your renderer.')

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

    return new QuadRenderer({
      width: 16,
      height: 16,
      type: HalfFloatType,
      colorSpace: LinearSRGBColorSpace,
      material,
      renderer: this._renderer,
      renderTargetOptions: this._renderTargetOptions
    })
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
