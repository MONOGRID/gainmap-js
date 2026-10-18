import { exp2, log2, mix, saturate, texture, uniform, vec3, vec4 } from 'three/tsl'
import {
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  MeshBasicNodeMaterial,
  type Node,
  type NodeFrame,
  NodeUpdateType,
  QuadMesh,
  RendererUtils,
  RenderTarget,
  Texture,
  TextureNode,
  type UniformNode,
  Vector3,
  type WebGPURenderer
} from 'three/webgpu'

import { type GainMapMetadata } from '../../../core/types'

// max half float value
const HALF_FLOAT_MAX = 65504

/**
 * Textures and uniforms driving a {@link GainMapNode} decode
 */
export type GainMapNodeUniforms = {
  sdr: TextureNode
  gainMap: TextureNode
  gamma: UniformNode<'vec3', Vector3>
  offsetSdr: UniformNode<'vec3', Vector3>
  offsetHdr: UniformNode<'vec3', Vector3>
  gainMapMin: UniformNode<'vec3', Vector3>
  gainMapMax: UniformNode<'vec3', Vector3>
  hdrCapacityMin: UniformNode<'float', number>
  hdrCapacityMax: UniformNode<'float', number>
  maxDisplayBoost: UniformNode<'float', number>
}

/**
 * A TSL texture node holding the HDR image decoded from an SDR image + gain map.
 *
 * The decode runs on the GPU into a HalfFloat render target, and only when something changed
 * (textures loaded/swapped or any uniform value changed): sampling the node costs a single
 * texture read, like any other texture.
 *
 * The node updates itself before rendering whenever it is part of a rendered node graph
 * (material, `scene.backgroundNode`, ...). When only its texture is used (`node.value`,
 * e.g. `scene.environment = node.value`) call {@link GainMapNode.decode} yourself.
 *
 * Re-decoding also flags the texture for PMREM regeneration,
 * so environment maps are recomputed only when the image actually changes.
 *
 * `node.value` gets its final size once loaded: three.js PMREMs don't follow texture resizes,
 * so assign it to `scene.environment` (or `pmremTexture()`) after load.
 *
 * @category Nodes
 * @group Nodes
 *
 * @example
 * import { GainMapNode } from '@monogrid/gainmap-js/webgpu'
 * import { equirectUV } from 'three/tsl'
 *
 * const hdr = new GainMapNode()
 *   .setTextures(sdrTexture, gainMapTexture)
 *   .setMetadata(metadata)
 *
 * material.colorNode = hdr
 * scene.backgroundNode = hdr.sample(equirectUV())
 * hdr.maxDisplayBoost.value = 2 // re-decodes once, on the next frame
 */
export class GainMapNode extends TextureNode {
  static get type () { return 'GainMapNode' }

  /**
   * Shared textures and uniforms
   */
  readonly uniforms: GainMapNodeUniforms

  /**
   * The render target holding the decoded HDR image
   */
  readonly renderTarget: RenderTarget

  private _quadMesh: QuadMesh
  private _material: MeshBasicNodeMaterial
  // filled by RendererUtils.resetRendererState
  private _rendererState = {} as RendererUtils.RendererState
  private _state: number[] = []

  constructor () {
    const renderTarget = new RenderTarget(1, 1, {
      type: HalfFloatType,
      colorSpace: LinearSRGBColorSpace,
      depthBuffer: false,
      generateMipmaps: true,
      minFilter: LinearMipmapLinearFilter,
      magFilter: LinearFilter
    })
    super(renderTarget.texture)

    this.renderTarget = renderTarget
    this.updateBeforeType = NodeUpdateType.RENDER

    const u: GainMapNodeUniforms = this.uniforms = {
      sdr: texture(new Texture()),
      gainMap: texture(new Texture()),
      gamma: uniform(new Vector3(1, 1, 1)),
      offsetSdr: uniform(new Vector3()),
      offsetHdr: uniform(new Vector3()),
      gainMapMin: uniform(new Vector3()),
      gainMapMax: uniform(new Vector3(1, 1, 1)),
      hdrCapacityMin: uniform(0),
      hdrCapacityMax: uniform(1),
      maxDisplayBoost: uniform(1)
    }

    const logRecovery = u.gainMap.rgb.pow(vec3(1).div(u.gamma))
    const logBoost = mix(u.gainMapMin, u.gainMapMax, logRecovery)
    const weight = saturate(log2(u.maxDisplayBoost).sub(u.hdrCapacityMin).div(u.hdrCapacityMax.sub(u.hdrCapacityMin)))
    const hdr = u.sdr.rgb.add(u.offsetSdr).mul(exp2(logBoost.mul(weight))).sub(u.offsetHdr)

    this._material = new MeshBasicNodeMaterial()
    this._material.name = 'GainMapDecoder'
    this._material.colorNode = vec4(hdr.clamp(-HALF_FLOAT_MAX, HALF_FLOAT_MAX), 1)
    this._quadMesh = new QuadMesh(this._material)
  }

  /** The SDR rendition texture (sRGB) */
  get sdr () { return this.uniforms.sdr.value }
  /** The gain map recovery texture (linear) */
  get gainMap () { return this.uniforms.gainMap.value }

  /** @see {@link GainMapMetadata.gamma} */
  get gamma () { return this.uniforms.gamma }
  /** @see {@link GainMapMetadata.offsetSdr} */
  get offsetSdr () { return this.uniforms.offsetSdr }
  /** @see {@link GainMapMetadata.offsetHdr} */
  get offsetHdr () { return this.uniforms.offsetHdr }
  /** @see {@link GainMapMetadata.gainMapMin} */
  get gainMapMin () { return this.uniforms.gainMapMin }
  /** @see {@link GainMapMetadata.gainMapMax} */
  get gainMapMax () { return this.uniforms.gainMapMax }
  /** @see {@link GainMapMetadata.hdrCapacityMin} */
  get hdrCapacityMin () { return this.uniforms.hdrCapacityMin }
  /** @see {@link GainMapMetadata.hdrCapacityMax} */
  get hdrCapacityMax () { return this.uniforms.hdrCapacityMax }
  /**
   * @see {@link GainmapDecodingParameters.maxDisplayBoost}
   * @remarks Non Logarithmic space
   */
  get maxDisplayBoost () { return this.uniforms.maxDisplayBoost }

  /** Width of the SDR image, 0 until loaded */
  get width (): number { return (this.sdr.image as { width?: number } | null)?.width ?? 0 }
  /** Height of the SDR image, 0 until loaded */
  get height (): number { return (this.sdr.image as { height?: number } | null)?.height ?? 0 }

  /**
   * Sets the SDR and gain map textures.
   * The SDR texture is expected in sRGB color space, the gain map in linear.
   *
   * @param sdr
   * @param gainMap
   */
  setTextures (sdr: Texture, gainMap: Texture) {
    this.uniforms.sdr.value = sdr
    this.uniforms.gainMap.value = gainMap
    // size the render target right away, so `value` has its final size before the first decode
    if (this.width > 0 && this.height > 0) this.renderTarget.setSize(this.width, this.height)
    return this
  }

  /**
   * Copies the gain map metadata into the uniforms.
   * Also sets `maxDisplayBoost` to fully restore the HDR range.
   *
   * @param metadata
   */
  setMetadata (metadata: GainMapMetadata) {
    const u = this.uniforms
    u.gamma.value.fromArray(metadata.gamma)
    u.offsetSdr.value.fromArray(metadata.offsetSdr)
    u.offsetHdr.value.fromArray(metadata.offsetHdr)
    u.gainMapMin.value.fromArray(metadata.gainMapMin)
    u.gainMapMax.value.fromArray(metadata.gainMapMax)
    u.hdrCapacityMin.value = metadata.hdrCapacityMin
    u.hdrCapacityMax.value = metadata.hdrCapacityMax
    u.maxDisplayBoost.value = Math.pow(2, metadata.hdrCapacityMax)
    return this
  }

  private _currentState () {
    const u = this.uniforms
    return [
      this.sdr.id, this.sdr.version, this.gainMap.id, this.gainMap.version,
      ...u.gamma.value.toArray(), ...u.offsetSdr.value.toArray(), ...u.offsetHdr.value.toArray(),
      ...u.gainMapMin.value.toArray(), ...u.gainMapMax.value.toArray(),
      u.hdrCapacityMin.value, u.hdrCapacityMax.value, u.maxDisplayBoost.value
    ]
  }

  /**
   * Decodes the image into {@link GainMapNode.renderTarget}, only if something changed since the last decode.
   *
   * Called automatically when the node is part of a rendered node graph.
   *
   * @param renderer
   * @returns `true` if the image was decoded
   */
  decode (renderer: WebGPURenderer) {
    // not loaded yet
    if (this.width === 0 || this.height === 0) return false

    const state = this._currentState()
    if (state.length === this._state.length && state.every((v, i) => v === this._state[i])) return false
    this._state = state

    RendererUtils.resetRendererState(renderer, this._rendererState)
    renderer.setRenderTarget(this.renderTarget)
    this._quadMesh.render(renderer)
    RendererUtils.restoreRendererState(renderer, this._rendererState)

    this.value.needsPMREMUpdate = true
    return true
  }

  override updateBefore (frame: NodeFrame) {
    if (frame.renderer) this.decode(frame.renderer as WebGPURenderer)
    return undefined
  }

  override set value (value: Texture) {
    if (this.renderTarget && value !== this.renderTarget.texture) {
      throw new Error('GainMapNode: the value of this node is its render target texture and can\'t be replaced')
    }
  }

  override get value (): Texture {
    return this.renderTarget?.texture
  }

  /**
   * Clones created by `sample()` & co. are plain TextureNodes reading this node's texture,
   * they keep it updated before rendering as well
   */
  override clone () {
    const node = new TextureNode(this.value, this.uvNode, this.levelNode, this.biasNode)
    node.sampler = this.sampler
    node.updateBeforeType = NodeUpdateType.RENDER
    node.updateBefore = (frame: NodeFrame) => this.updateBefore(frame)
    return node as unknown as this
  }

  /**
   * Disposes the render target, the SDR and gain map textures
   */
  override dispose () {
    this.renderTarget.dispose()
    this._material.dispose()
    this.sdr.dispose()
    this.gainMap.dispose()
    super.dispose()
  }
}

/**
 * TSL function creating a {@link GainMapNode} from an SDR texture, a gain map texture and its metadata
 *
 * @param sdr
 * @param gainMap
 * @param metadata
 */
export const gainMapNode = (sdr: Texture, gainMap: Texture, metadata: GainMapMetadata) =>
  new GainMapNode().setTextures(sdr, gainMap).setMetadata(metadata) as GainMapNode & Node
