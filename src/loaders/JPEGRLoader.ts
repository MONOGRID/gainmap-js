import {
  FileLoader,
  HalfFloatType
} from 'three'

import { decodeJPEGMetadata } from '../libultrahdr/decode-jpeg-metadata'
import { GainMapDecoderMaterial } from '../materials/GainMapDecoderMaterial'
import { QuadRenderer } from '../utils/QuadRenderer'
import { LoaderBase } from './LoaderBase'
/**
 * A Three.js Loader for a JPEG with embedded gainmap metadata.
 *
 * @category Loaders
 * @group Loaders
 *
 * @example
 * import { JPEGRLoader } from '@monogrid/gainmap-js/libultrahdr'
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
 * const loader = new JPEGRLoader(renderer)
 *
 * const result = loader.load('gainmap.jpeg')
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
 * // `result.renderTarget.texture` must be
 * // converted to `DataTexture` in order
 * // to use it as Equirectangular scene background
 * // if needed
 *
 * scene.background = result.toDataTexture()
 * scene.background.mapping = EquirectangularReflectionMapping
 * scene.background.minFilter = LinearFilter

 *
 */
export class JPEGRLoader extends LoaderBase<string> {
  /**
   *
   * @param url
   * @param onLoad
   * @param onProgress
   * @param onError
   * @returns
   */
  public override load (url: string, onLoad?: (data: QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: unknown) => void): QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial> {
    const quadRenderer = this.prepareQuadRenderer()

    const loader = new FileLoader(this.manager)
    loader.setResponseType('arraybuffer')
    loader.setRequestHeader(this.requestHeader)
    loader.setPath(this.path)
    loader.setWithCredentials(this.withCredentials)
    loader.load(url, async (jpeg) => {
      if (typeof jpeg === 'string') throw new Error('Invalid buffer')

      const { gainMap: gainMapJPEG, parsedMetadata } = await decodeJPEGMetadata(new Uint8Array(jpeg))

      await this.render(quadRenderer, gainMapJPEG, jpeg, parsedMetadata)

      if (typeof onLoad === 'function') onLoad(quadRenderer)

      quadRenderer.dispose()
    }, onProgress, onError)

    return quadRenderer
  }
}
