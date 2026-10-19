import {
  type NodeFrame,
  type NodeMaterial,
  NodeUpdateType,
  QuadMesh,
  RendererUtils,
  RenderTarget,
  type RenderTargetOptions,
  Texture,
  TextureNode,
  type WebGPURenderer
} from 'three/webgpu'

/**
 * Base class for TSL texture nodes whose texture is a render target, filled by rendering a full screen quad.
 *
 * The quad is rendered only when something changed since the last render:
 * subclasses list what the result depends on in {@link RenderTargetNode._getState}
 * and the other render target nodes they read from in {@link RenderTargetNode._getDependencies}.
 * Sampling the node costs a single texture read, like any other texture.
 *
 * The node renders itself before rendering whenever it is part of a rendered node graph
 * (material, `scene.backgroundNode`, ...). When only its texture is used (`node.value`)
 * call {@link RenderTargetNode.render} yourself.
 *
 * @category Nodes
 * @group Nodes
 */
export abstract class RenderTargetNode extends TextureNode {
  /**
   * The render target holding the result
   */
  readonly renderTarget: RenderTarget

  /**
   * Incremented every time the render target is rendered,
   * nodes depending on this one use it to know when to render again
   */
  revision = 0

  protected _quadMesh: QuadMesh
  protected _material: NodeMaterial
  // filled by RendererUtils.resetRendererState
  private _rendererState = {} as RendererUtils.RendererState
  private _state: unknown[] = []

  /**
   * @param material the material rendered on the full screen quad
   * @param renderTargetOptions options of the render target, it is created with a 1x1 size
   * and resized to {@link RenderTargetNode.width} x {@link RenderTargetNode.height} before rendering
   */
  constructor (material: NodeMaterial, renderTargetOptions: RenderTargetOptions) {
    const renderTarget = new RenderTarget(1, 1, { depthBuffer: false, ...renderTargetOptions })
    super(renderTarget.texture)

    this.renderTarget = renderTarget
    this.updateBeforeType = NodeUpdateType.RENDER

    this._material = material
    this._quadMesh = new QuadMesh(material)
  }

  /** Width of the result, the node doesn't render while it's 0 */
  abstract get width (): number
  /** Height of the result, the node doesn't render while it's 0 */
  abstract get height (): number

  /**
   * Values the result depends on, compared with `===` to the ones of the last render
   */
  protected abstract _getState (): unknown[]

  /**
   * Render target nodes read by this node, rendered (if needed) before this one
   */
  protected _getDependencies (): RenderTargetNode[] { return [] }

  /**
   * Called after the render target has been rendered
   */
  protected _onRender () {}

  /**
   * Forces a render the next time {@link RenderTargetNode.render} is called,
   * use it when something the node can't track changed (e.g. a custom input node)
   */
  invalidate () {
    this._state = []
    return this
  }

  /**
   * Renders into {@link RenderTargetNode.renderTarget}, only if something changed since the last render.
   *
   * Called automatically when the node is part of a rendered node graph.
   *
   * @param renderer
   * @returns `true` if the render target was rendered
   */
  render (renderer: WebGPURenderer) {
    const dependencies = this._getDependencies()
    for (const dependency of dependencies) dependency.render(renderer)

    const { width, height } = this
    // not ready yet
    if (width === 0 || height === 0) return false

    const state = [width, height, ...dependencies.map(d => d.revision), ...this._getState()]
    if (state.length === this._state.length && state.every((v, i) => v === this._state[i])) return false
    this._state = state

    if (this.renderTarget.width !== width || this.renderTarget.height !== height) this.renderTarget.setSize(width, height)

    RendererUtils.resetRendererState(renderer, this._rendererState)
    renderer.setRenderTarget(this.renderTarget)
    this._quadMesh.render(renderer)
    RendererUtils.restoreRendererState(renderer, this._rendererState)

    this.revision++
    this._onRender()
    return true
  }

  override updateBefore (frame: NodeFrame) {
    if (frame.renderer) this.render(frame.renderer as WebGPURenderer)
    return undefined
  }

  override set value (value: Texture) {
    if (this.renderTarget && value !== this.renderTarget.texture) {
      throw new Error(`${this.constructor.name}: the value of this node is its render target texture and can't be replaced`)
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
   * Disposes the render target and the material
   */
  override dispose () {
    this.renderTarget.dispose()
    this._material.dispose()
    super.dispose()
  }
}
