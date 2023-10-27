import {
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  LinearMipMapLinearFilter,
  Mesh,
  NoColorSpace,
  NoToneMapping,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  SRGBColorSpace,
  Texture,
  UnsignedByteType,
  UVMapping,
  WebGLRenderer,
  WebGLRenderTarget
} from 'three'

import { GainMapDecoderMaterial } from './materials/GainMapDecoderMaterial'
import { DecodeToDataArrayParameters, DecodeToRenderTargetParameters, DecodeToRenderTargetResult } from './types'

export { GainMapDecoderMaterial }

const instantiateRenderer = () => {
  const renderer = new WebGLRenderer()
  renderer.debug.checkShaderErrors = false
  renderer.setSize(128, 128)
  renderer.toneMapping = NoToneMapping
  renderer.outputColorSpace = NoColorSpace

  return renderer
}

const cleanup = ({ renderer, renderTarget, destroyRenderer, material }: { renderer?: WebGLRenderer, renderTarget?: WebGLRenderTarget, destroyRenderer?: boolean, material?: GainMapDecoderMaterial }) => {
  if (material) {
    material.uniforms.sdr.value.dispose()
    material.uniforms.gainMap.value.dispose()
    material.dispose()
  }

  if (destroyRenderer) {
    renderer?.dispose()
    renderer?.forceContextLoss()
  }
  renderTarget?.dispose()
}
/**
 * Decodes a gainmap using a WebGLRenderTarget
 *
 * @category Decoding Functions
 * @group Decoding Functions
 * @example
 * import { decode } from 'gainmap-js'
 * import { ImageBitmapLoader, Mesh, PlaneGeometry, MeshBasicMaterial } from 'three'
 *
 * const loader = new ImageBitmapLoader()
 * loader.setOptions( { imageOrientation: 'flipY' } )
 *
 * // load SDR Representation
 * const sdr = await loader.loadAsync('sdr.jpg')
 * // load Gainmap recovery image
 * const gainMap = await loader.loadAsync('gainmap.jpg')
 * // load metadata
 * const metadata = await (await fetch('metadata.json')).json()
 *
 * const result = await decodeToRenderTarget({
 *   sdr,
 *   gainMap,
 *   // this will restore the full HDR range
 *   maxDisplayBoost: Math.pow(2, metadata.hdrCapacityMax)
 *   ...metadata,
 * })
 *
 * // result can be used to populate a Texture
 * const mesh = new Mesh(new PlaneGeometry(), new MeshBasicMaterial({ map: result.renderTarget.texture }))
 *
 * @param params
 * @returns
 * @throws {Error} if the WebGLRenderer fails to render the gainmap
 */
export const decodeToRenderTarget = (params: DecodeToRenderTargetParameters): DecodeToRenderTargetResult => {
  const { sdr, gainMap, renderer } = params

  const scene = new Scene()

  const camera = new OrthographicCamera()
  camera.position.set(0, 0, 10)
  camera.left = -0.5
  camera.right = 0.5
  camera.top = 0.5
  camera.bottom = -0.5
  camera.updateProjectionMatrix()

  const renderTarget = new WebGLRenderTarget(sdr.width, sdr.height, {
    type: HalfFloatType,
    colorSpace: NoColorSpace,
    format: RGBAFormat,
    magFilter: LinearFilter,
    minFilter: LinearMipMapLinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: true
  })

  const sdrTexture = new Texture(sdr, UVMapping, ClampToEdgeWrapping, ClampToEdgeWrapping, LinearFilter, LinearFilter, RGBAFormat, UnsignedByteType, 1, SRGBColorSpace)
  sdrTexture.needsUpdate = true
  const gainMapTexture = new Texture(gainMap, UVMapping, ClampToEdgeWrapping, ClampToEdgeWrapping, LinearFilter, LinearFilter, RGBAFormat, UnsignedByteType, 1, NoColorSpace)
  gainMapTexture.needsUpdate = true

  const material = new GainMapDecoderMaterial({
    ...params,
    sdr: sdrTexture,
    gainMap: gainMapTexture
  })

  const plane = new Mesh(new PlaneGeometry(), material)
  plane.geometry.computeBoundingBox()
  scene.add(plane)

  const render = () => {
    renderer.setRenderTarget(renderTarget)
    try {
      renderer.render(scene, camera)
    } catch (e) {
      renderer.setRenderTarget(null)
      throw new Error('An error occurred while rendering the gainmap: ' + e)
    }
    renderer.setRenderTarget(null)
  }

  try {
    render()
  } catch (e) {
    cleanup({ renderTarget, material })
    throw e
  }

  return {
    renderTarget,
    material,
    render
  }
}
/**
 * Decodes a Gainmap to a raw `Uint16Array` which can be used to popupate a `DataTexture`.
 *
 * Uses {@link decodeToRenderTarget} internally then calls `readRenderTargetPixels` in order to return an `Uint16Array` which can be used to either:
 * * populate a DataTexture
 * * store the RAW data somewhere
 *
 * @category Decoding Functions
 * @group Decoding Functions
 * @see {@link decodeToRenderTarget}
 * @param params
 * @returns
 */
export const decode = (params: DecodeToDataArrayParameters) => {
  let _renderer = params.renderer
  let destroyRenderer = false
  if (!_renderer) {
    _renderer = instantiateRenderer()
    destroyRenderer = true
  }

  let decodeResult: ReturnType<typeof decodeToRenderTarget>

  try {
    decodeResult = decodeToRenderTarget({ ...params, renderer: _renderer })
  } catch (e) {
    cleanup({ renderer: _renderer, destroyRenderer })
    throw e
  }
  const { renderTarget, material } = decodeResult

  const out = new Uint16Array(renderTarget.width * renderTarget.height * 4)
  _renderer.readRenderTargetPixels(renderTarget, 0, 0, renderTarget.width, renderTarget.height, out)
  cleanup({ renderer: _renderer, renderTarget, destroyRenderer, material })
  return out
}
