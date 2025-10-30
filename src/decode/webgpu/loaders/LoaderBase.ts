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
  WebGPURenderer
} from 'three/webgpu'

import { type GainMapMetadata, QuadRendererTextureOptions } from '../../../core/types'
import { getHTMLImageFromBlob } from '../../core/utils/get-html-image-from-blob'
import { QuadRenderer } from '../core/QuadRenderer'
import { GainMapDecoderMaterial } from '../materials/GainMapDecoderMaterial'

/**
 * Base class for WebGPU loaders
 *
 * @template TMaterial - The material type
 * @template TUrl - The URL type for loading
 */
export abstract class LoaderBase<TUrl = string> extends Loader<QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>, TUrl> {
  private _renderer?: WebGPURenderer
  private _renderTargetOptions?: QuadRendererTextureOptions
  protected _internalLoadingManager: LoadingManager

  constructor (renderer?: WebGPURenderer, manager?: LoadingManager) {
    super(manager)
    if (renderer) this._renderer = renderer
    this._internalLoadingManager = new LoadingManager()
  }

  public setRenderer (renderer: WebGPURenderer) {
    this._renderer = renderer
    return this
  }

  public setRenderTargetOptions (options: QuadRendererTextureOptions) {
    this._renderTargetOptions = options
    return this
  }

  protected prepareQuadRenderer () {
    if (!this._renderer) console.warn('WARNING: A WebGPU Renderer was not passed to this Loader constructor or in setRenderer, the result of this Loader will need to be converted to a Data Texture with toDataTexture() before you can use it in your renderer.')

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

  protected async render (quadRenderer: QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>, metadata: GainMapMetadata, sdrBuffer: ArrayBuffer, gainMapBuffer?: ArrayBuffer) {
    const gainMapBlob = gainMapBuffer ? new Blob([gainMapBuffer], { type: 'image/jpeg' }) : undefined
    const sdrBlob = new Blob([sdrBuffer], { type: 'image/jpeg' })

    let sdrImage: ImageBitmap | HTMLImageElement
    let gainMapImage: ImageBitmap | HTMLImageElement | undefined
    // in WebGPU we apparently don't need flipY under any circumstance
    // except in QuadRenderer.toDataTexture() where we perform it in the texture itself
    let needsFlip = false

    if (typeof createImageBitmap === 'undefined') {
      const res = await Promise.all([
        gainMapBlob ? getHTMLImageFromBlob(gainMapBlob) : Promise.resolve(undefined),
        getHTMLImageFromBlob(sdrBlob)
      ])
      gainMapImage = res[0]
      sdrImage = res[1]
      needsFlip = false
    } else {
      const res = await Promise.all([
        gainMapBlob ? createImageBitmap(gainMapBlob, { imageOrientation: 'from-image' }) : Promise.resolve(undefined),
        createImageBitmap(sdrBlob, { imageOrientation: 'from-image' })
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

    await quadRenderer.render()
  }
}
