import {
  FileLoader,
  HalfFloatType
} from 'three'

import { QuadRenderer } from '../../core/QuadRenderer'
import { GainMapMetadata } from '../../core/types'
import { GainMapDecoderMaterial } from '../materials/GainMapDecoderMaterial'
import { LoaderBase } from './LoaderBase'
/**
 * A Three.js Loader for the gain map format.
 *
 * @category Loaders
 * @group Loaders
 *
 * @example
 * import { GainMapLoader } from '@monogrid/gainmap-js'
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
 * const loader = new GainMapLoader(renderer)
 *
 * const result = loader.load(['sdr.jpeg', 'gainmap.jpeg', 'metadata.json'])
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
export class GainMapLoader extends LoaderBase<[string, string, string]> {
  /**
   * Loads a gainmap using separate data
   * * sdr image
   * * gain map image
   * * metadata json
   *
   * useful for webp gain maps
   *
   * @param urls An array in the form of [sdr.jpg, gainmap.jpg, metadata.json]
   * @param onLoad Load complete callback, will receive the result
   * @param onProgress Progress callback, will receive a {@link ProgressEvent}
   * @param onError Error callback
   * @returns
   */
  public load ([sdrUrl, gainMapUrl, metadataUrl]: [string, string, string], onLoad?: (data: QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: unknown) => void): QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial> {
    const quadRenderer = this.prepareQuadRenderer()

    let sdr: ArrayBuffer | undefined
    let gainMap: ArrayBuffer | undefined
    let metadata: GainMapMetadata | undefined

    const loadCheck = async () => {
      if (sdr && gainMap && metadata) {
        await this.render(quadRenderer, gainMap, sdr, metadata)

        if (typeof onLoad === 'function') onLoad(quadRenderer)

        quadRenderer.dispose()
      }
    }

    let sdrLengthComputable = true
    let sdrTotal = 0
    let sdrLoaded = 0

    let gainMapLengthComputable = true
    let gainMapTotal = 0
    let gainMapLoaded = 0

    let metadataLengthComputable = true
    let metadataTotal = 0
    let metadataLoaded = 0

    const progressHandler = () => {
      if (typeof onProgress === 'function') {
        const total = sdrTotal + gainMapTotal + metadataTotal
        const loaded = sdrLoaded + gainMapLoaded + metadataLoaded
        const lengthComputable = sdrLengthComputable && gainMapLengthComputable && metadataLengthComputable
        onProgress(new ProgressEvent('progress', { lengthComputable, loaded, total }))
      }
    }

    const sdrLoader = new FileLoader(this.manager)
    sdrLoader.setResponseType('arraybuffer')
    sdrLoader.setRequestHeader(this.requestHeader)
    sdrLoader.setPath(this.path)
    sdrLoader.setWithCredentials(this.withCredentials)
    sdrLoader.load(sdrUrl, async (buffer) => {
      if (typeof buffer === 'string') throw new Error('Invalid sdr buffer')
      sdr = buffer
      loadCheck()
    }, (e: ProgressEvent) => {
      sdrLengthComputable = e.lengthComputable
      sdrLoaded = e.loaded
      sdrTotal = e.total
      progressHandler()
    }, onError)

    const gainMapLoader = new FileLoader(this.manager)
    gainMapLoader.setResponseType('arraybuffer')
    gainMapLoader.setRequestHeader(this.requestHeader)
    gainMapLoader.setPath(this.path)
    gainMapLoader.setWithCredentials(this.withCredentials)
    gainMapLoader.load(gainMapUrl, async (buffer) => {
      if (typeof buffer === 'string') throw new Error('Invalid gainmap buffer')
      gainMap = buffer
      loadCheck()
    }, (e: ProgressEvent) => {
      gainMapLengthComputable = e.lengthComputable
      gainMapLoaded = e.loaded
      gainMapTotal = e.total
      progressHandler()
    }, onError)

    const metadataLoader = new FileLoader(this.manager)
    // metadataLoader.setResponseType('json')
    metadataLoader.setRequestHeader(this.requestHeader)
    metadataLoader.setPath(this.path)
    metadataLoader.setWithCredentials(this.withCredentials)
    metadataLoader.load(metadataUrl, async (json) => {
      if (typeof json !== 'string') throw new Error('Invalid metadata string')
      metadata = JSON.parse(json)
      loadCheck()
    }, (e: ProgressEvent) => {
      metadataLengthComputable = e.lengthComputable
      metadataLoaded = e.loaded
      metadataTotal = e.total
      progressHandler()
    }, onError)

    return quadRenderer
  }
}
