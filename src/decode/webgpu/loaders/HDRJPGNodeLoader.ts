import { GainMapMetadata } from '../../../core/types'
import { extractGainmapFromJPEG, GainMapNotFoundError, XMPMetadataNotFoundError } from '../../shared'
import { GainMapNode } from '../nodes/GainMapNode'
import { LoaderBaseNode } from './LoaderBaseNode'

/**
 * A Three.js Loader for a JPEG with embedded gain map metadata,
 * returning a {@link GainMapNode} (a TSL texture node holding the decoded HDR image).
 *
 * No renderer is needed: `load` returns the node synchronously
 * (like `TextureLoader` returns a `Texture`), it can be assigned to materials right away
 * and it is decoded on the GPU once loaded.
 *
 * @category Loaders
 * @group Loaders
 *
 * @example
 * import { HDRJPGNodeLoader } from '@monogrid/gainmap-js/webgpu'
 * import { equirectUV } from 'three/tsl'
 * import { MeshBasicNodeMaterial } from 'three/webgpu'
 *
 * const hdr = new HDRJPGNodeLoader().load('gainmap.jpeg')
 *
 * const material = new MeshBasicNodeMaterial()
 * material.colorNode = hdr
 *
 * scene.backgroundNode = hdr.sample(equirectUV())
 *
 * // all parameters are uniforms, changing them re-decodes the image once
 * hdr.maxDisplayBoost.value = 2
 */
export class HDRJPGNodeLoader extends LoaderBaseNode<string> {
  /**
   * Loads a JPEG containing gain map metadata
   * Renders a normal SDR image if gainmap data is not found
   *
   * @param url Path to a JPEG file containing embedded gain map metadata
   * @param onLoad Load complete callback, will receive the node
   * @param onProgress Progress callback, will receive a `ProgressEvent`
   * @param onError Error callback
   * @returns a node which can be used immediately, it will hold the image once loaded
   */
  public override load (url: string, onLoad?: (data: GainMapNode) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: unknown) => void): GainMapNode {
    const node = new GainMapNode()

    this.manager.itemStart(url)
    this.createFileLoader('arraybuffer').load(url, async (jpeg) => {
      try {
        /* istanbul ignore if
         this condition exists only because of three.js types + strict mode
        */
        if (typeof jpeg === 'string') throw new Error('Invalid buffer, received [string], was expecting [ArrayBuffer]')
        const jpegBuffer = new Uint8Array(jpeg)
        let sdrJPEG: Uint8Array<ArrayBuffer>
        let gainMapJPEG: Uint8Array<ArrayBuffer> | undefined
        let metadata: GainMapMetadata
        try {
          const extractionResult = await extractGainmapFromJPEG(jpegBuffer)
          sdrJPEG = extractionResult.sdr
          gainMapJPEG = extractionResult.gainMap
          metadata = extractionResult.metadata
        } catch (e: unknown) {
          // render the SDR version if this is not a gainmap
          if (e instanceof XMPMetadataNotFoundError || e instanceof GainMapNotFoundError) {
            console.warn(`Failure to reconstruct an HDR image from ${url}: Gain map metadata not found in the file, HDRJPGNodeLoader will render the SDR jpeg`)
            metadata = {
              gainMapMin: [0, 0, 0],
              gainMapMax: [1, 1, 1],
              gamma: [1, 1, 1],
              hdrCapacityMin: 0,
              hdrCapacityMax: 1,
              offsetHdr: [0, 0, 0],
              offsetSdr: [0, 0, 0]
            }
            sdrJPEG = jpegBuffer
          } else {
            throw e
          }
        }

        await this.fillNode(node, metadata, sdrJPEG.buffer, gainMapJPEG?.buffer)
      } catch (error) {
        this.manager.itemError(url)
        if (typeof onError === 'function') onError(error)
        return
      }

      if (typeof onLoad === 'function') onLoad(node)
      this.manager.itemEnd(url)
    }, onProgress,
    (error: unknown) => {
      this.manager.itemError(url)
      if (typeof onError === 'function') onError(error)
    })

    return node
  }
}
