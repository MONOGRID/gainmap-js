import {
  HalfFloatType,
  WebGPURenderer
} from 'three/webgpu'

import { createDecodeFunction, DecodeParameters } from '../shared'
import { QuadRenderer } from './core/QuadRenderer'
import { GainMapDecoderMaterial } from './materials/GainMapDecoderMaterial'

/**
 * Decodes a gain map using WebGPU RenderTarget
 *
 * @category Decoding Functions
 * @group Decoding Functions
 * @example
 * import { decode } from '@monogrid/gainmap-js/webgpu'
 * import {
 *   Mesh,
 *   MeshBasicMaterial,
 *   PerspectiveCamera,
 *   PlaneGeometry,
 *   Scene,
 *   TextureLoader,
 *   WebGPURenderer
 * } from 'three/webgpu'
 *
 * const renderer = new WebGPURenderer()
 *
 * const textureLoader = new TextureLoader()
 *
 * // load SDR Representation
 * const sdr = await textureLoader.loadAsync('sdr.jpg')
 * // load Gain map recovery image
 * const gainMap = await textureLoader.loadAsync('gainmap.jpg')
 * // load metadata
 * const metadata = await (await fetch('metadata.json')).json()
 *
 * const result = await decode({
 *   sdr,
 *   gainMap,
 *   // this allows to use `result.renderTarget.texture` directly
 *   renderer,
 *   // this will restore the full HDR range
 *   maxDisplayBoost: Math.pow(2, metadata.hdrCapacityMax),
 *   ...metadata
 * })
 *
 * const scene = new Scene()
 * // `result` can be used to populate a Texture
 * const mesh = new Mesh(
 *   new PlaneGeometry(),
 *   new MeshBasicMaterial({ map: result.renderTarget.texture })
 * )
 * scene.add(mesh)
 * renderer.render(scene, new PerspectiveCamera())
 *
 * // result must be manually disposed
 * // when you are done using it
 * result.dispose()
 *
 * @param params
 * @returns
 * @throws {Error} if the WebGPURenderer fails to render the gain map
 */
const decodeImpl = createDecodeFunction<WebGPURenderer, QuadRenderer<typeof HalfFloatType, GainMapDecoderMaterial>, GainMapDecoderMaterial>({
  createMaterial: (params) => new GainMapDecoderMaterial(params),
  createQuadRenderer: (params) => new QuadRenderer(params)
})

export const decode = async (params: DecodeParameters<WebGPURenderer>): Promise<InstanceType<typeof QuadRenderer<typeof HalfFloatType, InstanceType<typeof GainMapDecoderMaterial>>>> => {
  // Ensure renderer is defined for the base function
  if (!params.renderer) {
    throw new Error('Renderer is required for decode function')
  }

  const quadRenderer = decodeImpl({
    ...params,
    renderer: params.renderer
  })
  try {
    await quadRenderer.render()
  } catch (e) {
    quadRenderer.disposeOnDemandRenderer()
    throw e
  }
  return quadRenderer
}
