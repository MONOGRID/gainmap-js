import {
  FileLoader,
  HalfFloatType
} from 'three'

import { QuadRenderer } from '../../core/QuadRenderer'
import { GainMapNotFoundError } from '../errors/GainMapNotFoundError'
import { XMPMetadataNotFoundError } from '../errors/XMPMetadataNotFoundError'
import { extractGainmapFromJPEG } from '../extract'
import { GainMapMetadata } from '../index'
import { GainMapDecoderMaterial } from '../materials/GainMapDecoderMaterial'
import { LoaderBase } from './LoaderBase'

/**
 * A Three.js Loader for a JPEG with embedded gainmap metadata.
 *
 * @category Loaders
 * @group Loaders
 *
 * @example
 * import { HDRJPGLoader } from '@monogrid/gainmap-js'
 * import {
 *   EquirectangularReflectionMapping,
 *   LinearFilter,
 *   Mesh,
 *   MeshBasicMaterial,
 *   PerspectiveCamera,
 *   PlaneGeometry,
 *   Scene,
 *   WebGLRenderer
 * } from 'three'
 *
 * const renderer = new WebGLRenderer()
 *
 * const loader = new HDRJPGLoader(renderer)
 *
 * const result = await loader.loadAsync('gainmap.jpeg')
 * // `result` can be used to populate a Texture
 *
 * const scene = new Scene()
 * const mesh = new Mesh(
 *   new PlaneGeometry(),
 *   new MeshBasicMaterial({ map: result.renderTarget.texture })
 * )
 * scene.add(mesh)
 * renderer.render(scene, new PerspectiveCamera())
 *
 * // Starting from three.js r159
 * // `result.renderTarget.texture` can
 * // also be used as Equirectangular scene background
 * //
 * // it was previously needed to convert it
 * // to a DataTexture with `result.toDataTexture()`
 * scene.background = result.renderTarget.texture
 * scene.background.mapping = EquirectangularReflectionMapping
 *
 * // result must be manually disposed
 * // when you are done using it
 * result.dispose()
 *
 */
export class HDRJPGLoader extends LoaderBase<string> {
  /**
   * Loads a JPEG containing gain map metadata
   * Renders a normal SDR image if gainmap data is not found
   *
   * @param url An array in the form of [sdr.jpg, gainmap.jpg, metadata.json]
   * @param onLoad Load complete callback, will receive the result
   * @param onProgress Progress callback, will receive a {@link ProgressEvent}
   * @param onError Error callback
   * @returns
   */
  public override load (url: string, onLoad?: (data: QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: unknown) => void): QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial> {
    const quadRenderer = this.prepareQuadRenderer()

    const loader = new FileLoader(this._internalLoadingManager)
    loader.setResponseType('arraybuffer')
    loader.setRequestHeader(this.requestHeader)
    loader.setPath(this.path)
    loader.setWithCredentials(this.withCredentials)
    this.manager.itemStart(url)
    loader.load(url, async (jpeg) => {
      /* istanbul ignore if
       this condition exists only because of three.js types + strict mode
      */
      if (typeof jpeg === 'string') throw new Error('Invalid buffer, received [string], was expecting [ArrayBuffer]')
      const jpegBuffer = new Uint8Array(jpeg)
      let sdrJPEG: Uint8Array
      let gainMapJPEG: Uint8Array | undefined
      let metadata: GainMapMetadata
      try {
        const extractionResult = await extractGainmapFromJPEG(jpegBuffer)
        // gain map is successfully reconstructed
        sdrJPEG = extractionResult.sdr
        gainMapJPEG = extractionResult.gainMap
        metadata = extractionResult.metadata
      } catch (e: unknown) {
        // render the SDR version if this is not a gainmap
        if (e instanceof XMPMetadataNotFoundError || e instanceof GainMapNotFoundError) {
          console.warn(`Failure to reconstruct an HDR image from ${url}: Gain map metadata not found in the file, HDRJPGLoader will render the SDR jpeg`)
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

      // solves #16
      try {
        await this.render(quadRenderer, metadata, sdrJPEG, gainMapJPEG)
      } catch (error) {
        this.manager.itemError(url)
        if (typeof onError === 'function') onError(error)
        quadRenderer.disposeOnDemandRenderer()
        return
      }

      if (typeof onLoad === 'function') onLoad(quadRenderer)
      this.manager.itemEnd(url)
      quadRenderer.disposeOnDemandRenderer()
    }, onProgress
    , (error: unknown) => {
      this.manager.itemError(url)
      if (typeof onError === 'function') onError(error)
    })

    return quadRenderer
  }
}
