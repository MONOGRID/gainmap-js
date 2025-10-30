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
  UVMapping
} from 'three'

import { type GainMapMetadata, QuadRendererTextureOptions } from '../../core/types'
import { getHTMLImageFromBlob } from './utils/get-html-image-from-blob'

/**
 * Configuration for the loader base class
 */
export interface LoaderBaseConfig<TRenderer, TQuadRenderer, TMaterial> {
  renderer?: TRenderer
  renderTargetOptions?: QuadRendererTextureOptions
  createMaterial: (params: {
    gainMapMax: [number, number, number]
    gainMapMin: [number, number, number]
    gamma: [number, number, number]
    offsetHdr: [number, number, number]
    offsetSdr: [number, number, number]
    hdrCapacityMax: number
    hdrCapacityMin: number
    maxDisplayBoost: number
    gainMap: Texture
    sdr: Texture
  }) => TMaterial
  createQuadRenderer: (params: {
    width: number
    height: number
    type: typeof HalfFloatType
    colorSpace: typeof LinearSRGBColorSpace
    material: TMaterial
    renderer?: TRenderer
    renderTargetOptions?: QuadRendererTextureOptions
  }) => TQuadRenderer
}

/**
 * Shared base class for loaders that extracts common logic
 */
export abstract class LoaderBaseShared<TRenderer, TQuadRenderer, TMaterial, TUrl = string> extends Loader<TQuadRenderer, TUrl> {
  private _renderer?: TRenderer
  private _renderTargetOptions?: QuadRendererTextureOptions
  protected _internalLoadingManager: LoadingManager
  protected _config: LoaderBaseConfig<TRenderer, TQuadRenderer, TMaterial>

  constructor (config: LoaderBaseConfig<TRenderer, TQuadRenderer, TMaterial>, manager?: LoadingManager) {
    super(manager)
    this._config = config
    if (config.renderer) this._renderer = config.renderer
    this._internalLoadingManager = new LoadingManager()
  }

  public setRenderer (renderer: TRenderer) {
    this._renderer = renderer
    return this
  }

  public setRenderTargetOptions (options: QuadRendererTextureOptions) {
    this._renderTargetOptions = options
    return this
  }

  protected prepareQuadRenderer (): TQuadRenderer {
    if (!this._renderer) {
      console.warn('WARNING: A Renderer was not passed to this Loader constructor or in setRenderer, the result of this Loader will need to be converted to a Data Texture with toDataTexture() before you can use it in your renderer.')
    }

    const material = this._config.createMaterial({
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

    return this._config.createQuadRenderer({
      width: 16,
      height: 16,
      type: HalfFloatType,
      colorSpace: LinearSRGBColorSpace,
      material,
      renderer: this._renderer,
      renderTargetOptions: this._renderTargetOptions
    })
  }

  protected async processImages (
    sdrBuffer: ArrayBuffer,
    gainMapBuffer?: ArrayBuffer,
    imageOrientation?: 'flipY' | 'from-image'
  ): Promise<{
    sdrImage: ImageBitmap | HTMLImageElement
    gainMapImage: ImageBitmap | HTMLImageElement | undefined
    needsFlip: boolean
  }> {
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
      needsFlip = imageOrientation === 'flipY'
    } else {
      const res = await Promise.all([
        gainMapBlob ? createImageBitmap(gainMapBlob, { imageOrientation: imageOrientation || 'flipY' }) : Promise.resolve(undefined),
        createImageBitmap(sdrBlob, { imageOrientation: imageOrientation || 'flipY' })
      ])
      gainMapImage = res[0]
      sdrImage = res[1]
    }

    return { sdrImage, gainMapImage, needsFlip }
  }

  protected createTextures (
    sdrImage: ImageBitmap | HTMLImageElement,
    gainMapImage: ImageBitmap | HTMLImageElement | undefined,
    needsFlip: boolean
  ): { gainMap: Texture, sdr: Texture } {
    const gainMap = new Texture(
      gainMapImage || new ImageData(2, 2),
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

    const sdr = new Texture(
      sdrImage,
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

    return { gainMap, sdr }
  }

  protected updateQuadRenderer (
    quadRenderer: TQuadRenderer & {
      width: number
      height: number
      material: TMaterial & {
        gainMap: Texture
        sdr: Texture
        gainMapMin: [number, number, number]
        gainMapMax: [number, number, number]
        offsetHdr: [number, number, number]
        offsetSdr: [number, number, number]
        gamma: [number, number, number]
        hdrCapacityMin: number
        hdrCapacityMax: number
        maxDisplayBoost: number
        needsUpdate: boolean
      }
    },
    sdrImage: ImageBitmap | HTMLImageElement,
    gainMap: Texture,
    sdr: Texture,
    metadata: GainMapMetadata
  ): void {
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
  }
}
