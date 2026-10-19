import { float, Fn, ivec2, max, min, screenCoordinate, textureLoad, uniform, vec2, vec4 } from 'three/tsl'
import {
  type DataTextureLoaderTexData,
  FloatType,
  NearestFilter,
  NoBlending,
  type Node,
  NodeMaterial,
  QuadMesh,
  RendererUtils,
  RenderTarget,
  Texture,
  Vector2,
  type WebGPURenderer
} from 'three/webgpu'

import { getDataTexture } from '../../core/get-data-texture'
import { type HDRInput } from './nodes/SDRRenditionNode'
import { readRenderTargetPixels } from './read-render-target-pixels'

// max half float value
const HALF_FLOAT_MAX = 65504
const CELL_SIZE = 2

const isTextureData = (image: unknown): image is DataTextureLoaderTexData =>
  typeof image === 'object' && image !== null && 'data' in image && 'width' in image && 'height' in image && !(image instanceof Texture)

/**
 * Finds the min or max value of each RGB channel of an HDR image, on the GPU.
 *
 * The image is reduced by 2x2 cells until it's 1x1, then the single remaining pixel is read back.
 * Negative values are ignored when looking for the max, values above 65504 (max half float) when looking for the min.
 *
 * @category Utility
 * @group Utility
 *
 * @example
 * import { findTextureMinMax } from '@monogrid/gainmap-js/encode/webgpu'
 *
 * const [r, g, b] = await findTextureMinMax(exrTexture, 'max', renderer)
 * const maxContentBoost = Math.max(r, g, b)
 *
 * @param image the HDR image: a texture, raw texture data or a TSL node (which requires `size`)
 * @param mode
 * @param renderer
 * @param size size of the image, required when the image is a generic node
 * @throws {Error} if the image is a generic node and `size` is not provided
 */
export const findTextureMinMax = async (
  image: HDRInput | DataTextureLoaderTexData,
  mode: 'min' | 'max',
  renderer: WebGPURenderer,
  size?: { width: number, height: number }
): Promise<[number, number, number]> => {
  const rendererState = RendererUtils.resetRendererState(renderer, {} as RendererUtils.RendererState)
  const renderTargets: RenderTarget[] = []
  const quad = new QuadMesh(new NodeMaterial())
  const createRenderTarget = (width: number, height: number) => {
    const renderTarget = new RenderTarget(width, height, {
      type: FloatType,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      generateMipmaps: false,
      depthBuffer: false
    })
    renderTargets.push(renderTarget)
    return renderTarget
  }
  const renderQuad = (material: NodeMaterial, renderTarget: RenderTarget) => {
    material.blending = NoBlending
    material.depthTest = false
    material.depthWrite = false
    quad.material = material
    renderer.setRenderTarget(renderTarget)
    quad.render(renderer)
  }

  try {
    let source: Texture
    let width: number
    let height: number

    if (image instanceof Texture || isTextureData(image)) {
      source = image instanceof Texture ? image : getDataTexture(image)
      const sourceImage = source.image as { width: number, height: number }
      width = sourceImage.width
      height = sourceImage.height
    } else {
      // generic nodes are rendered at full resolution first
      if (!size) throw new Error('findTextureMinMax: size is required when the image is a node')
      width = size.width
      height = size.height
      const material = new NodeMaterial()
      material.fragmentNode = vec4(image as Node<'vec4'>)
      const renderTarget = createRenderTarget(width, height)
      renderQuad(material, renderTarget)
      material.dispose()
      source = renderTarget.texture
    }

    // creates a material reducing 2x2 cells of a texture into 1 pixel
    const createReduceMaterial = (texture: Texture, width: number, height: number) => {
      const sourceSize = uniform(new Vector2(width, height))
      const sourceTexture = textureLoad(texture)
      const reduce = Fn(() => {
        // the first pixel of the source cell
        const sourcePixel = screenCoordinate.xy.floor().mul(CELL_SIZE)
        const last = sourceSize.sub(1)
        const result = vec4(float(mode === 'max' ? 0 : HALF_FLOAT_MAX)).toVar()
        for (let y = 0; y < CELL_SIZE; y++) {
          for (let x = 0; x < CELL_SIZE; x++) {
            // pixels outside the source repeat the edge ones
            const texel = sourceTexture.load(ivec2(min(sourcePixel.add(vec2(x, y)), last)))
            result.assign(mode === 'max' ? max(result, texel) : min(result, texel))
          }
        }
        return result
      })
      const material = new NodeMaterial()
      material.fragmentNode = reduce()
      return { material, sourceTexture, sourceSize }
    }

    // the source may have a different format from the intermediate (float) render targets,
    // it is reduced by its own material
    let reducer = createReduceMaterial(source, width, height)
    let renderTarget: RenderTarget | undefined
    while (width > 1 || height > 1 || !renderTarget) {
      width = Math.max(1, Math.ceil(width / CELL_SIZE))
      height = Math.max(1, Math.ceil(height / CELL_SIZE))
      const sourceRenderTarget: RenderTarget | undefined = renderTarget
      renderTarget = createRenderTarget(width, height)
      if (sourceRenderTarget) {
        if (reducer.sourceTexture.value === source) {
          reducer.material.dispose()
          reducer = createReduceMaterial(sourceRenderTarget.texture, sourceRenderTarget.width, sourceRenderTarget.height)
        } else {
          reducer.sourceTexture.value = sourceRenderTarget.texture
          reducer.sourceSize.value.set(sourceRenderTarget.width, sourceRenderTarget.height)
        }
      }
      renderQuad(reducer.material, renderTarget)
    }

    reducer.material.dispose()

    const out = await readRenderTargetPixels(renderer, renderTarget) as Float32Array
    return [out[0], out[1], out[2]]
  } finally {
    RendererUtils.restoreRendererState(renderer, rendererState)
    renderTargets.forEach(renderTarget => renderTarget.dispose())
  }
}
