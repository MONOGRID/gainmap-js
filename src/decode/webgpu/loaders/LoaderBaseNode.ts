import { FileLoader, Loader } from 'three/webgpu'

import { type GainMapMetadata } from '../../../core/types'
import { createTextures, processImages } from '../../shared'
import { GainMapNode } from '../nodes/GainMapNode'

/**
 * Base class for loaders returning a {@link GainMapNode}
 * @template TUrl - The type of URL used to load resources
 */
export abstract class LoaderBaseNode<TUrl = string> extends Loader<GainMapNode, TUrl> {
  /**
   * @private
   * @param responseType
   */
  protected createFileLoader (responseType?: 'arraybuffer') {
    const loader = new FileLoader(this.manager)
    if (responseType) loader.setResponseType(responseType)
    loader.setRequestHeader(this.requestHeader)
    loader.setPath(this.path)
    loader.setWithCredentials(this.withCredentials)
    return loader
  }

  /**
   * Decodes the images and feeds them to the node, together with the metadata
   *
   * @private
   * @param node
   * @param metadata
   * @param sdrBuffer
   * @param gainMapBuffer
   */
  protected async fillNode (node: GainMapNode, metadata: GainMapMetadata, sdrBuffer: ArrayBuffer, gainMapBuffer?: ArrayBuffer) {
    // flipY like any other three.js texture, so the node can be sampled with regular uvs
    const { sdrImage, gainMapImage } = await processImages(sdrBuffer, gainMapBuffer, 'from-image')
    const { sdr, gainMap } = createTextures(sdrImage, gainMapImage, true)
    node.setTextures(sdr, gainMap).setMetadata(metadata)
  }
}
