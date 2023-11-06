import {
  ClampToEdgeWrapping,
  FileLoader,
  HalfFloatType,
  LinearFilter,
  LinearMipMapLinearFilter,
  Loader,
  LoadingManager,
  NoColorSpace,
  RGBAFormat,
  SRGBColorSpace,
  Texture,
  UnsignedByteType,
  UVMapping,
  WebGLRenderer
} from 'three'

import { decodeJPEGMetadata } from '../libultrahdr'
import { GainMapDecoderMaterial } from '../materials/GainMapDecoderMaterial'
import { GainMapMetadata } from '../types'
import { QuadRenderer } from '../utils/QuadRenderer'
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
 * // to use it as Equirectanmgular scene background
 * // if needed
 *
 * scene.background = result.toDataTexture()
 * scene.background.mapping = EquirectangularReflectionMapping
 * scene.background.minFilter = LinearFilter
 *
 */
export class GainMapLoader extends Loader<QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>> {
  private renderer: WebGLRenderer
  /**
   *
   * @param renderer
   * @param manager
   */
  constructor (renderer: WebGLRenderer, manager?: LoadingManager) {
    super(manager)
    this.renderer = renderer
  }

  /**
   *
   * @returns
   */
  private prepareQuadRenderer () {
    // temporary values
    const material = new GainMapDecoderMaterial({
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

    return new QuadRenderer(16, 16, HalfFloatType, NoColorSpace, material, this.renderer)
  }

  /**
   *
   * @param quadRenderer
   * @param gainMapBuffer
   * @param sdrBuffer
   * @param metadata
   */
  private async render (quadRenderer: QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>, gainMapBuffer: ArrayBuffer | string, sdrBuffer: ArrayBuffer | string, metadata: GainMapMetadata) {
    const gainMapBlob = new Blob([gainMapBuffer], { type: 'image/jpeg' })
    // TODO: figure out why result.sdr is not usable here, problem is in the libultrahdr-wasm repo
    // we use the original image buffer instead
    const sdrBlob = new Blob([sdrBuffer], { type: 'image/jpeg' })

    const [gainMapImageBitmap, sdrImageBitmap] = await Promise.all([
      createImageBitmap(gainMapBlob, { imageOrientation: 'flipY' }),
      createImageBitmap(sdrBlob, { imageOrientation: 'flipY' })
    ])

    const gainMap = new Texture(gainMapImageBitmap,
      UVMapping,
      ClampToEdgeWrapping,
      ClampToEdgeWrapping,
      LinearFilter,
      LinearMipMapLinearFilter,
      RGBAFormat,
      UnsignedByteType,
      1,
      NoColorSpace
    )

    gainMap.needsUpdate = true

    const sdr = new Texture(sdrImageBitmap,
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

    sdr.needsUpdate = true

    quadRenderer.width = sdrImageBitmap.width
    quadRenderer.height = sdrImageBitmap.height
    quadRenderer.material.gainMap = gainMap
    quadRenderer.material.sdr = sdr
    quadRenderer.material.gainMapMin = metadata.gainMapMin
    quadRenderer.material.gainMapMax = metadata.gainMapMax
    quadRenderer.material.offsetHdr = metadata.offsetHdr
    quadRenderer.material.offsetSdr = metadata.offsetSdr
    quadRenderer.material.gamma = metadata.gamma
    quadRenderer.material.maxDisplayBoost = metadata.hdrCapacityMax
    quadRenderer.material.needsUpdate = true

    quadRenderer.render()
  }

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

  /**
   * Loads a gainmap using separate data
   * * sdr image
   * * gain map image
   * * metadata json
   *
   * useful for webp gainmaps
   *
   * @param sdrUrl
   * @param gainMapUrl
   * @param metadataUrl
   * @param onLoad
   * @param onProgress
   * @param onError
   * @returns
   */
  public loadSeparateData (sdrUrl: string, gainMapUrl: string, metadataUrl: string, onLoad?: (data: QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: unknown) => void): QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial> {
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

    const sdrLoader = new FileLoader(this.manager)
    sdrLoader.setResponseType('arraybuffer')
    sdrLoader.setRequestHeader(this.requestHeader)
    sdrLoader.setPath(this.path)
    sdrLoader.setWithCredentials(this.withCredentials)
    sdrLoader.load(sdrUrl, async (buffer) => {
      if (typeof buffer === 'string') throw new Error('Invalid sdr buffer')
      sdr = buffer
      loadCheck()
    })

    const gainMapLoader = new FileLoader(this.manager)
    gainMapLoader.setResponseType('arraybuffer')
    gainMapLoader.setRequestHeader(this.requestHeader)
    gainMapLoader.setPath(this.path)
    gainMapLoader.setWithCredentials(this.withCredentials)
    gainMapLoader.load(gainMapUrl, async (buffer) => {
      if (typeof buffer === 'string') throw new Error('Invalid gainmap buffer')
      gainMap = buffer
      loadCheck()
    })

    const metadataLoader = new FileLoader(this.manager)
    // metadataLoader.setResponseType('json')
    metadataLoader.setRequestHeader(this.requestHeader)
    metadataLoader.setPath(this.path)
    metadataLoader.setWithCredentials(this.withCredentials)
    metadataLoader.load(metadataUrl, async (json) => {
      if (typeof json !== 'string') throw new Error('Invalid metadata string')
      metadata = JSON.parse(json)
      loadCheck()
    })

    return quadRenderer
  }
}
