import {
  HalfFloatType,
  LoadingManager,
  WebGPURenderer
} from 'three/webgpu'

import { type GainMapMetadata } from '../../../core/types'
import { LoaderBaseShared } from '../../shared'
import { QuadRenderer } from '../core/QuadRenderer'
import { GainMapDecoderMaterial } from '../materials/GainMapDecoderMaterial'

/**
 * Base class for WebGPU loaders
 * @template TUrl - The type of URL used to load resources
 */
export abstract class LoaderBaseWebGPU<TUrl = string> extends LoaderBaseShared<WebGPURenderer, QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>, GainMapDecoderMaterial, TUrl> {
  constructor (renderer?: WebGPURenderer, manager?: LoadingManager) {
    super({
      renderer,
      createMaterial: (params) => new GainMapDecoderMaterial(params),
      createQuadRenderer: (params) => new QuadRenderer(params)
    }, manager)
  }

  /**
   * @private
   * @param quadRenderer
   * @param metadata
   * @param sdrBuffer
   * @param gainMapBuffer
   */
  protected async render (quadRenderer: QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>, metadata: GainMapMetadata, sdrBuffer: ArrayBuffer, gainMapBuffer?: ArrayBuffer) {
    // in WebGPU we apparently don't need flipY under any circumstance
    // except in QuadRenderer.toDataTexture() where we perform it in the texture itself
    const { sdrImage, gainMapImage, needsFlip } = await this.processImages(sdrBuffer, gainMapBuffer, 'from-image')
    const { gainMap, sdr } = this.createTextures(sdrImage, gainMapImage, needsFlip)
    this.updateQuadRenderer(quadRenderer, sdrImage, gainMap, sdr, metadata)
    await quadRenderer.render()
  }
}
