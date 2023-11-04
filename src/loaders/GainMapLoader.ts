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
import { QuadRenderer } from '../utils/QuadRenderer'

export class GainMapLoader extends Loader<QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>> {
  private renderer?: WebGLRenderer

  constructor (renderer?: WebGLRenderer, manager?: LoadingManager) {
    super(manager)
    this.renderer = renderer
  }

  public override load (url: string, onLoad: (data: QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: unknown) => void): QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial> {
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

    const quadRenderer = new QuadRenderer(16, 16, HalfFloatType, NoColorSpace, material, this.renderer)

    const loader = new FileLoader(this.manager)
    loader.setResponseType('arraybuffer')
    loader.setRequestHeader(this.requestHeader)
    loader.setPath(this.path)
    loader.setWithCredentials(this.withCredentials)
    loader.load(url, async (buffer) => {
      if (typeof buffer === 'string') throw new Error('Invalid buffer')

      const { gainMap: gainMapJPEG, parsedMetadata } = await decodeJPEGMetadata(new Uint8Array(buffer))

      const gainMapBlob = new Blob([gainMapJPEG], { type: 'image/jpeg' })
      // TODO: figure out why result.sdr is not usable here, problem is in the libultrahdr-wasm repo
      // we use the original image buffer instead
      const sdrBlob = new Blob([buffer], { type: 'image/jpeg' })

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
      quadRenderer.material.gainMapMin = parsedMetadata.gainMapMin
      quadRenderer.material.gainMapMax = parsedMetadata.gainMapMax
      quadRenderer.material.offsetHdr = parsedMetadata.offsetHdr
      quadRenderer.material.offsetSdr = parsedMetadata.offsetSdr
      quadRenderer.material.gamma = parsedMetadata.gamma
      quadRenderer.material.maxDisplayBoost = parsedMetadata.hdrCapacityMax
      quadRenderer.material.needsUpdate = true

      quadRenderer.render()

      // const gainmapBackground = new DataTexture(
      //   quadRenderer.toArray(),
      //   quadRenderer.width,
      //   quadRenderer.height,
      //   RGBAFormat,
      //   HalfFloatType,
      //   EquirectangularReflectionMapping,
      //   ClampToEdgeWrapping,
      //   ClampToEdgeWrapping,
      //   LinearFilter,
      //   LinearFilter,
      //   1,
      //   NoColorSpace
      // )

      if (onLoad) onLoad(quadRenderer)

      quadRenderer.dispose()
    }, onProgress, onError)

    return quadRenderer
  }
}
