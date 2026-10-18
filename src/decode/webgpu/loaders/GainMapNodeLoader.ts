import { GainMapMetadata } from '../../../core/types'
import { GainMapNode } from '../nodes/GainMapNode'
import { LoaderBaseNode } from './LoaderBaseNode'

/**
 * A Three.js Loader for the gain map format stored as separate files (sdr image, gain map image, metadata json),
 * returning a {@link GainMapNode} (a TSL texture node holding the decoded HDR image).
 *
 * No renderer is needed: `load` returns the node synchronously, it can be assigned to materials right away
 * and it is decoded on the GPU once loaded.
 *
 * @category Loaders
 * @group Loaders
 *
 * @example
 * import { GainMapNodeLoader } from '@monogrid/gainmap-js/webgpu'
 * import { MeshBasicNodeMaterial } from 'three/webgpu'
 *
 * const hdr = new GainMapNodeLoader().load([
 *   'sdr.webp',
 *   'gainmap.webp',
 *   'metadata.json'
 * ])
 *
 * const material = new MeshBasicNodeMaterial()
 * material.colorNode = hdr
 */
export class GainMapNodeLoader extends LoaderBaseNode<[string, string, string]> {
  /**
   * Loads a gainmap using separate data
   * * sdr image
   * * gain map image
   * * metadata json
   *
   * useful for webp gain maps
   *
   * @param urls An array in the form of [sdr.jpg, gainmap.jpg, metadata.json]
   * @param onLoad Load complete callback, will receive the node
   * @param onProgress Progress callback, will receive a `ProgressEvent`
   * @param onError Error callback
   * @returns a node which can be used immediately, it will hold the image once loaded
   */
  public override load (urls: [string, string, string], onLoad?: (data: GainMapNode) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: unknown) => void): GainMapNode {
    const node = new GainMapNode()
    const progress = urls.map(() => ({ lengthComputable: true, loaded: 0, total: 0 }))

    const loadFile = (url: string, index: number, responseType?: 'arraybuffer') => new Promise<string | ArrayBuffer>((resolve, reject) => {
      this.manager.itemStart(url)
      this.createFileLoader(responseType).load(url, resolve, (e: ProgressEvent) => {
        progress[index] = { lengthComputable: e.lengthComputable, loaded: e.loaded, total: e.total }
        if (typeof onProgress === 'function') {
          onProgress(new ProgressEvent('progress', {
            lengthComputable: progress.every(p => p.lengthComputable),
            loaded: progress.reduce((sum, p) => sum + p.loaded, 0),
            total: progress.reduce((sum, p) => sum + p.total, 0)
          }))
        }
      }, reject)
    })

    const [sdrUrl, gainMapUrl, metadataUrl] = urls
    Promise.all([
      loadFile(sdrUrl, 0, 'arraybuffer'),
      loadFile(gainMapUrl, 1, 'arraybuffer'),
      loadFile(metadataUrl, 2)
    ]).then(async ([sdr, gainMap, json]) => {
      /* istanbul ignore if
       this condition exists only because of three.js types + strict mode
      */
      if (typeof sdr === 'string' || typeof gainMap === 'string' || typeof json !== 'string') throw new Error('Invalid response types')
      // TODO: implement check on JSON file
      const metadata = JSON.parse(json) as GainMapMetadata
      await this.fillNode(node, metadata, sdr, gainMap)
    }).then(() => {
      if (typeof onLoad === 'function') onLoad(node)
      urls.forEach(url => this.manager.itemEnd(url))
    }, (error: unknown) => {
      urls.forEach(url => this.manager.itemError(url))
      if (typeof onError === 'function') onError(error)
    })

    return node
  }
}
