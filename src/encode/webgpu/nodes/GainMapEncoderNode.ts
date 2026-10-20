import { log2, pow, saturate, texture, uniform, vec4 } from 'three/tsl'
import {
  LinearFilter,
  LinearSRGBColorSpace,
  NoBlending,
  type Node,
  NodeMaterial,
  type UniformNode,
  UnsignedByteType,
  Vector3
} from 'three/webgpu'

import { type GainMapMetadata } from '../../../core/types'
import { RenderTargetNode } from '../../../core/webgpu/RenderTargetNode'
import { type GainmapEncodingParameters } from '../../types'
import { SDRRenditionNode } from './SDRRenditionNode'

// maxContentBoost must be > 1, a gain map can't encode an empty boost range
const MIN_MAX_CONTENT_BOOST = 1.0001

/**
 * Uniforms driving a {@link GainMapEncoderNode}
 */
export type GainMapEncoderNodeUniforms = {
  gamma: UniformNode<'vec3', Vector3>
  offsetSdr: UniformNode<'vec3', Vector3>
  offsetHdr: UniformNode<'vec3', Vector3>
  minContentBoost: UniformNode<'float', number>
  maxContentBoost: UniformNode<'float', number>
}

/**
 * A TSL texture node holding the gain map (recovery map) of an HDR image: the second step of gain map encoding.
 *
 * The gain map is computed from the HDR input of a {@link SDRRenditionNode} and its SDR rendition,
 * into an 8 bit linear render target. The result is identical to the one of the WebGL `GainMapEncoderMaterial`.
 *
 * It renders only when something changed (the SDR rendition or any uniform value),
 * the SDR rendition is rendered first when needed.
 *
 * @category Nodes
 * @group Nodes
 *
 * @example
 * import { GainMapEncoderNode, SDRRenditionNode } from '@monogrid/gainmap-js/encode/webgpu'
 *
 * const sdr = new SDRRenditionNode(hdrTexture)
 * const gainMap = new GainMapEncoderNode(sdr, { maxContentBoost: 8 })
 *
 * material.colorNode = gainMap
 * gainMap.gamma.value.setScalar(1.2) // renders again once, on the next frame
 * const metadata = gainMap.metadata
 */
export class GainMapEncoderNode extends RenderTargetNode {
  static get type () { return 'GainMapEncoderNode' }

  /**
   * The SDR rendition this gain map is computed from
   */
  readonly sdr: SDRRenditionNode

  /**
   * Shared uniforms
   */
  readonly uniforms: GainMapEncoderNodeUniforms

  /**
   * The linear gain of each pixel, `(hdr + offsetHdr) / (sdr + offsetSdr)`, before it's clamped
   * to the content boost range and encoded
   */
  readonly pixelGain: Node<'vec3'>

  private _warned: unknown[] = []

  /**
   * @param sdr the SDR rendition, its HDR input is the HDR input of the gain map
   * @param params encoding parameters, all of them can be changed later through the uniforms
   */
  constructor (sdr: SDRRenditionNode, params: Partial<GainmapEncodingParameters> = {}) {
    super(new NodeMaterial(), {
      type: UnsignedByteType,
      colorSpace: LinearSRGBColorSpace,
      minFilter: LinearFilter,
      magFilter: LinearFilter
    })
    this.sdr = sdr

    const u: GainMapEncoderNodeUniforms = this.uniforms = {
      gamma: uniform(new Vector3().fromArray(params.gamma ?? [1, 1, 1])),
      offsetSdr: uniform(new Vector3().fromArray(params.offsetSdr ?? [1 / 64, 1 / 64, 1 / 64])),
      offsetHdr: uniform(new Vector3().fromArray(params.offsetHdr ?? [1 / 64, 1 / 64, 1 / 64])),
      // 0 is not a valid min content boost
      minContentBoost: uniform(params.minContentBoost || 1),
      maxContentBoost: uniform(params.maxContentBoost ?? MIN_MAX_CONTENT_BOOST)
    }

    // logarithms are computed on the CPU (in double precision), like the WebGL encoder does
    const minLog2 = uniform(0).onRenderUpdate(() => Math.log2(this.metadataMinContentBoost))
    const maxLog2 = uniform(0).onRenderUpdate(() => Math.log2(this.metadataMaxContentBoost))

    const sdrColor = texture(sdr.value).rgb
    const hdrColor = vec4(sdr.hdr as Node<'vec4'>).rgb

    const pixelGain = this.pixelGain = hdrColor.add(u.offsetHdr).div(sdrColor.add(u.offsetSdr))
    const logRecovery = log2(pixelGain).sub(minLog2).div(maxLog2.sub(minLog2))
    const clampedRecovery = saturate(logRecovery)

    this._material.name = 'GainMapEncoder'
    this._material.blending = NoBlending
    this._material.depthTest = false
    this._material.depthWrite = false
    this._material.fragmentNode = vec4(pow(clampedRecovery, u.gamma), 1.0)
  }

  /** @see {@link GainmapEncodingParameters.gamma} */
  get gamma () { return this.uniforms.gamma }
  /** @see {@link GainmapEncodingParameters.offsetSdr} */
  get offsetSdr () { return this.uniforms.offsetSdr }
  /** @see {@link GainmapEncodingParameters.offsetHdr} */
  get offsetHdr () { return this.uniforms.offsetHdr }
  /**
   * @see {@link GainmapEncodingParameters.minContentBoost}
   * @remarks Non logarithmic space
   */
  get minContentBoost () { return this.uniforms.minContentBoost }
  /**
   * @see {@link GainmapEncodingParameters.maxContentBoost}
   * @remarks Non logarithmic space, values <= 1 are clamped to 1.0001 since a gain map can't encode an empty boost range
   */
  get maxContentBoost () { return this.uniforms.maxContentBoost }

  /** Same size as the SDR rendition */
  get width () { return this.sdr.width }
  /** Same size as the SDR rendition */
  get height () { return this.sdr.height }

  /** The min content boost actually encoded */
  private get metadataMinContentBoost () { return this.uniforms.minContentBoost.value }
  /** The max content boost actually encoded, clamped to a valid range */
  private get metadataMaxContentBoost () { return Math.max(this.uniforms.maxContentBoost.value, MIN_MAX_CONTENT_BOOST) }

  /**
   * The gain map metadata matching the current uniform values
   */
  get metadata (): GainMapMetadata {
    const u = this.uniforms
    const gainMapMin = Math.log2(this.metadataMinContentBoost)
    const gainMapMax = Math.log2(this.metadataMaxContentBoost)
    return {
      gamma: u.gamma.value.toArray(),
      offsetSdr: u.offsetSdr.value.toArray(),
      offsetHdr: u.offsetHdr.value.toArray(),
      gainMapMin: [gainMapMin, gainMapMin, gainMapMin],
      gainMapMax: [gainMapMax, gainMapMax, gainMapMax],
      hdrCapacityMin: Math.max(0, gainMapMin),
      hdrCapacityMax: Math.max(0, gainMapMax)
    }
  }

  protected override _getState () {
    const u = this.uniforms
    return [
      ...u.gamma.value.toArray(), ...u.offsetSdr.value.toArray(), ...u.offsetHdr.value.toArray(),
      u.minContentBoost.value, u.maxContentBoost.value
    ]
  }

  protected override _getDependencies () {
    return [this.sdr]
  }

  protected override _onRender () {
    // warn once per invalid combination of parameters
    const { minContentBoost, maxContentBoost } = this.uniforms
    const state = [minContentBoost.value, maxContentBoost.value]
    if (state.every((v, i) => v === this._warned[i])) return
    this._warned = state

    if (maxContentBoost.value <= 1) {
      console.warn(`gainmap-js: maxContentBoost is ${maxContentBoost.value} (<= 1), the source image has no HDR content. It will be clamped to ${MIN_MAX_CONTENT_BOOST} and the result will be equivalent to an SDR image.`)
    }
    if (this.metadataMinContentBoost >= this.metadataMaxContentBoost) {
      console.warn(`gainmap-js: minContentBoost (${this.metadataMinContentBoost}) must be lower than maxContentBoost (${this.metadataMaxContentBoost}), the resulting gain map will be invalid.`)
    }
  }
}

/**
 * TSL function creating a {@link GainMapEncoderNode}
 *
 * @param sdr the SDR rendition, its HDR input is the HDR input of the gain map
 * @param params encoding parameters
 */
export const gainMapEncoder = (sdr: SDRRenditionNode, params?: Partial<GainmapEncodingParameters>) =>
  new GainMapEncoderNode(sdr, params) as GainMapEncoderNode & Node
