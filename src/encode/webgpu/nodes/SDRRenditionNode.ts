import { float, mat4, texture, toneMapping, uniform, vec3, vec4 } from 'three/tsl'
import {
  ACESFilmicToneMapping,
  LinearFilter,
  NoBlending,
  type Node,
  NodeMaterial,
  SRGBColorSpace,
  Texture,
  TextureNode,
  type ToneMapping,
  type UniformNode,
  UnsignedByteType
} from 'three/webgpu'

import { RenderTargetNode } from '../../../core/webgpu/RenderTargetNode'

/**
 * HDR input of the encoder: a texture or any TSL node returning a linear HDR color (vec3 or vec4)
 *
 * Nodes are evaluated on a full screen quad, `uv()` spans the whole output image.
 *
 * @category Encoding Parameters
 * @group Encoding Parameters
 */
export type HDRInput = Texture | Node

/**
 * Options of a {@link SDRRenditionNode}
 *
 * @category Encoding Parameters
 * @group Encoding Parameters
 */
export type SDRRenditionNodeOptions = {
  /**
   * Tone mapping applied to the SDR rendition
   * @defaultValue `ACESFilmicToneMapping`
   */
  toneMapping?: ToneMapping
  /**
   * Width of the output, required when the HDR input is a generic node
   * (textures and texture nodes provide their own size)
   */
  width?: number
  /**
   * Height of the output, required when the HDR input is a generic node
   * (textures and texture nodes provide their own size)
   */
  height?: number
}

/**
 * Uniforms driving a {@link SDRRenditionNode}
 */
export type SDRRenditionNodeUniforms = {
  exposure: UniformNode<'float', number>
  brightness: UniformNode<'float', number>
  contrast: UniformNode<'float', number>
  saturation: UniformNode<'float', number>
}

const textureSize = (texture: Texture) => {
  const image = texture.image as { width?: number, height?: number } | null
  return { width: image?.width ?? 0, height: image?.height ?? 0 }
}

/**
 * A TSL texture node holding the SDR rendition of an HDR image: the first step of gain map encoding.
 *
 * The HDR input is exposed, tone mapped (with the three.js TSL tone mapping functions)
 * and adjusted (brightness, contrast, saturation) into an 8 bit sRGB render target.
 *
 * It renders only when something changed (input, tone mapping or any uniform value):
 * sampling the node costs a single texture read, like any other texture.
 *
 * @category Nodes
 * @group Nodes
 *
 * @example
 * import { SDRRenditionNode } from '@monogrid/gainmap-js/encode/webgpu'
 * import { AgXToneMapping, LinearToneMapping } from 'three/webgpu'
 *
 * const sdr = new SDRRenditionNode(hdrTexture, { toneMapping: AgXToneMapping })
 * material.colorNode = sdr
 * sdr.exposure.value = 0.8 // renders again once, on the next frame
 * sdr.setToneMapping(LinearToneMapping)
 */
export class SDRRenditionNode extends RenderTargetNode {
  static get type () { return 'SDRRenditionNode' }

  /**
   * The HDR input, as a node
   */
  readonly hdr: Node

  /**
   * Shared uniforms
   */
  readonly uniforms: SDRRenditionNodeUniforms

  private _hdrTexture: Texture | null
  private _hdrSource: RenderTargetNode | null
  private _width: number | undefined
  private _height: number | undefined
  private _toneMapping: ToneMapping = ACESFilmicToneMapping

  /**
   * @param hdr HDR input, a texture or a TSL node returning a linear HDR color
   * @param options
   * @throws {Error} if the input is a generic node and `width` or `height` are not provided
   */
  constructor (hdr: HDRInput, options: SDRRenditionNodeOptions = {}) {
    super(new NodeMaterial(), {
      type: UnsignedByteType,
      colorSpace: SRGBColorSpace,
      minFilter: LinearFilter,
      magFilter: LinearFilter
    })

    this._hdrTexture = hdr instanceof Texture ? hdr : hdr instanceof TextureNode ? hdr.value : null
    this._hdrSource = hdr instanceof RenderTargetNode ? hdr : null
    this.hdr = hdr instanceof Texture ? texture(hdr) : hdr
    this._width = options.width
    this._height = options.height
    if (!this._hdrTexture && (!this._width || !this._height)) {
      throw new Error('SDRRenditionNode: width and height are required when the HDR input is not a texture')
    }

    this.uniforms = {
      exposure: uniform(1),
      brightness: uniform(0),
      contrast: uniform(1),
      saturation: uniform(1)
    }

    this._material.name = 'SDRRendition'
    this._material.blending = NoBlending
    this._material.depthTest = false
    this._material.depthWrite = false
    this.setToneMapping(options.toneMapping ?? ACESFilmicToneMapping)
  }

  /** Exposure applied to the HDR input before tone mapping */
  get exposure () { return this.uniforms.exposure }
  /** Brightness offset applied after tone mapping */
  get brightness () { return this.uniforms.brightness }
  /** Contrast applied after tone mapping */
  get contrast () { return this.uniforms.contrast }
  /** Saturation applied after tone mapping */
  get saturation () { return this.uniforms.saturation }

  /**
   * The tone mapping applied to the SDR rendition
   */
  getToneMapping () { return this._toneMapping }

  /**
   * Sets the tone mapping applied to the SDR rendition
   * (`toneMapping` can't be used as a property name: it's a TSL method of every node)
   *
   * @param value any three.js tone mapping, e.g. `ACESFilmicToneMapping`, `AgXToneMapping`, `NeutralToneMapping`
   * or `LinearToneMapping` (which keeps the SDR rendition closest to the HDR input)
   */
  setToneMapping (value: ToneMapping) {
    this._toneMapping = value
    this._material.fragmentNode = this._buildOutput()
    this._material.needsUpdate = true
    return this
  }

  /** Width of the output, 0 while the input texture is not loaded */
  get width (): number {
    if (this._width) return this._width
    if (this._hdrSource) return this._hdrSource.width
    return this._hdrTexture ? textureSize(this._hdrTexture).width : 0
  }

  /** Height of the output, 0 while the input texture is not loaded */
  get height (): number {
    if (this._height) return this._height
    if (this._hdrSource) return this._hdrSource.height
    return this._hdrTexture ? textureSize(this._hdrTexture).height : 0
  }

  private _buildOutput () {
    const u = this.uniforms
    const color = vec4(this.hdr as Node<'vec4'>)

    // exposure is applied here rather than by the tone mapping function, so it works with `NoToneMapping` too
    const toneMapped = vec4(toneMapping(this._toneMapping, float(1), color.rgb.mul(u.exposure)), color.a)

    const b = u.brightness
    const brightnessMatrix = mat4(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      b, b, b, 1
    )

    const c = u.contrast
    const t = float(1.0).sub(c).div(2.0)
    const contrastMatrix = mat4(
      c, 0, 0, 0,
      0, c, 0, 0,
      0, 0, c, 0,
      t, t, t, 1
    )

    const luminance = vec3(0.3086, 0.6094, 0.0820)
    const oneMinusSat = float(1.0).sub(u.saturation)
    const red = vec3(luminance.x.mul(oneMinusSat)).add(vec3(u.saturation, 0, 0))
    const green = vec3(luminance.y.mul(oneMinusSat)).add(vec3(0, u.saturation, 0))
    const blue = vec3(luminance.z.mul(oneMinusSat)).add(vec3(0, 0, u.saturation))
    const saturationMatrix = mat4(
      vec4(red, 0),
      vec4(green, 0),
      vec4(blue, 0),
      vec4(0, 0, 0, 1)
    )

    return brightnessMatrix.mul(contrastMatrix).mul(saturationMatrix).mul(toneMapped)
  }

  protected override _getState () {
    const u = this.uniforms
    return [
      this._hdrTexture?.id, this._hdrTexture?.version, this._toneMapping,
      u.exposure.value, u.brightness.value, u.contrast.value, u.saturation.value
    ]
  }

  protected override _getDependencies () {
    return this._hdrSource ? [this._hdrSource] : []
  }
}

/**
 * TSL function creating a {@link SDRRenditionNode}
 *
 * @param hdr HDR input, a texture or a TSL node returning a linear HDR color
 * @param options
 */
export const sdrRendition = (hdr: HDRInput, options?: SDRRenditionNodeOptions) =>
  new SDRRenditionNode(hdr, options) as SDRRenditionNode & Node
