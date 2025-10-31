import {
  HalfFloatType,
  LoadingManager,
  type WebGLRenderer
} from 'three'

import { QuadRenderer } from '../../../core/QuadRenderer'
import { type GainMapMetadata } from '../../../core/types'
import { LoaderBaseShared } from '../../shared'
import { GainMapDecoderMaterial } from '../materials/GainMapDecoderMaterial'

/**
 * Base class for WebGL loaders
 * @template TUrl - The type of URL used to load resources
 */
export abstract class LoaderBaseWebGL<TUrl = string> extends LoaderBaseShared<WebGLRenderer, QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>, GainMapDecoderMaterial, TUrl> {
  constructor (renderer?: WebGLRenderer, manager?: LoadingManager) {
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
    const { sdrImage, gainMapImage, needsFlip } = await this.processImages(sdrBuffer, gainMapBuffer, 'flipY')
    const { gainMap, sdr } = this.createTextures(sdrImage, gainMapImage, needsFlip)
    this.updateQuadRenderer(quadRenderer, sdrImage, gainMap, sdr, metadata)
    quadRenderer.render()
  }
}
