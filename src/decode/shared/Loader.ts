import {
  HalfFloatType,
  LinearSRGBColorSpace,
  Loader,
  LoadingManager,
  Texture
} from 'three'

import { type GainMapMetadata, QuadRendererTextureOptions } from '../../core/types'
import { DecodeParameters } from './types'
import { createTextures, processImages } from './utils/create-textures'

/**
 * Configuration for the loader base class
 */
export interface LoaderBaseConfig<TRenderer, TQuadRenderer, TMaterial> {
  renderer?: TRenderer
  renderTargetOptions?: QuadRendererTextureOptions
  createMaterial: (params: DecodeParameters) => TMaterial
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
      gainMap: new Texture<HTMLImageElement>(),
      sdr: new Texture<HTMLImageElement>()
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

  protected processImages (sdrBuffer: ArrayBuffer, gainMapBuffer?: ArrayBuffer, imageOrientation?: 'flipY' | 'from-image') {
    return processImages(sdrBuffer, gainMapBuffer, imageOrientation)
  }

  protected createTextures (sdrImage: ImageBitmap | HTMLImageElement, gainMapImage: ImageBitmap | HTMLImageElement | undefined, needsFlip: boolean) {
    return createTextures(sdrImage, gainMapImage, needsFlip)
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
