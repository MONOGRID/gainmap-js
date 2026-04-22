import { texture, uniform, vec3 } from 'three/tsl'
import { MeshBasicNodeMaterial, NoBlending, Texture, TextureNode, UniformNode, Vector3 } from 'three/webgpu'

import { GainMapMetadata } from '../../../core/types'
import { type GainmapDecodingParameters } from '../../shared'

// min half float value
const HALF_FLOAT_MIN = vec3(-65504, -65504, -65504)
// max half float value
const HALF_FLOAT_MAX = vec3(65504, 65504, 65504)

/**
 * A Material which is able to decode the Gainmap into a full HDR Representation using TSL (Three.js Shading Language)
 *
 * @category Materials
 * @group Materials
 */
export class GainMapDecoderMaterial extends MeshBasicNodeMaterial {
  private _maxDisplayBoost: GainmapDecodingParameters['maxDisplayBoost']
  private _hdrCapacityMin: GainMapMetadata['hdrCapacityMin']
  private _hdrCapacityMax: GainMapMetadata['hdrCapacityMax']

  // Uniforms for TSL
  private _gammaUniform: UniformNode<'vec3', Vector3>
  private _offsetHdrUniform: UniformNode<'vec3', Vector3>
  private _offsetSdrUniform: UniformNode<'vec3', Vector3>
  private _gainMapMinUniform: UniformNode<'vec3', Vector3>
  private _gainMapMaxUniform: UniformNode<'vec3', Vector3>
  private _weightFactorUniform: UniformNode<'float', number>
  private _sdrTexture: TextureNode
  private _gainMapTexture: TextureNode

  /**
   *
   * @param params
   */
  constructor ({ gamma, offsetHdr, offsetSdr, gainMapMin, gainMapMax, maxDisplayBoost, hdrCapacityMin, hdrCapacityMax, sdr, gainMap }: GainMapMetadata & GainmapDecodingParameters & { sdr: Texture, gainMap: Texture }) {
    super()

    this.name = 'GainMapDecoderMaterial'
    this.blending = NoBlending
    this.depthTest = false
    this.depthWrite = false

    this._sdrTexture = texture(sdr)
    this._gainMapTexture = texture(gainMap)

    this._gammaUniform = uniform(new Vector3(1.0 / gamma[0], 1.0 / gamma[1], 1.0 / gamma[2]))
    this._offsetHdrUniform = uniform(new Vector3(offsetHdr[0], offsetHdr[1], offsetHdr[2]))
    this._offsetSdrUniform = uniform(new Vector3(offsetSdr[0], offsetSdr[1], offsetSdr[2]))
    this._gainMapMinUniform = uniform(new Vector3(gainMapMin[0], gainMapMin[1], gainMapMin[2]))
    this._gainMapMaxUniform = uniform(new Vector3(gainMapMax[0], gainMapMax[1], gainMapMax[2]))

    const weightFactor = (Math.log2(maxDisplayBoost) - hdrCapacityMin) / (hdrCapacityMax - hdrCapacityMin)
    this._weightFactorUniform = uniform(weightFactor, 'float')

    this._maxDisplayBoost = maxDisplayBoost
    this._hdrCapacityMin = hdrCapacityMin
    this._hdrCapacityMax = hdrCapacityMax

    // Build the TSL shader graph

    const rgb = this._sdrTexture.rgb
    const recovery = this._gainMapTexture.rgb

    const logRecovery = recovery.pow(this._gammaUniform)

    // logBoost = gainMapMin * (1.0 - logRecovery) + gainMapMax * logRecovery
    const logBoost = this._gainMapMinUniform.mul(logRecovery.oneMinus())
      .add(this._gainMapMaxUniform.mul(logRecovery))

    // hdrColor = (rgb + offsetSdr) * exp2(logBoost * weightFactor) - offsetHdr
    // Note: standalone exp2() is typed for scalars only in @types/three, so we use
    // the mathematically equivalent pow(2, x) which has proper vec3 typings.
    const gain = vec3(2).pow(logBoost.mul(this._weightFactorUniform))
    const hdrColor = rgb.add(this._offsetSdrUniform).mul(gain).sub(this._offsetHdrUniform)

    const clampedHdrColor = hdrColor.min(HALF_FLOAT_MAX).max(HALF_FLOAT_MIN)

    this.colorNode = clampedHdrColor
  }

  get sdr () { return this._sdrTexture.value }
  set sdr (value: Texture) { this._sdrTexture.value = value }

  get gainMap () { return this._gainMapTexture.value }
  set gainMap (value: Texture) { this._gainMapTexture.value = value }

  /**
   * @see {@link GainMapMetadata.offsetHdr}
   */
  get offsetHdr (): [number, number, number] {
    return [this._offsetHdrUniform.value.x, this._offsetHdrUniform.value.y, this._offsetHdrUniform.value.z]
  }

  set offsetHdr (value: [number, number, number]) {
    this._offsetHdrUniform.value.x = value[0]
    this._offsetHdrUniform.value.y = value[1]
    this._offsetHdrUniform.value.z = value[2]
  }

  /**
   * @see {@link GainMapMetadata.offsetSdr}
   */
  get offsetSdr (): [number, number, number] {
    return [this._offsetSdrUniform.value.x, this._offsetSdrUniform.value.y, this._offsetSdrUniform.value.z]
  }

  set offsetSdr (value: [number, number, number]) {
    this._offsetSdrUniform.value.x = value[0]
    this._offsetSdrUniform.value.y = value[1]
    this._offsetSdrUniform.value.z = value[2]
  }

  /**
   * @see {@link GainMapMetadata.gainMapMin}
   */
  get gainMapMin (): [number, number, number] {
    return [this._gainMapMinUniform.value.x, this._gainMapMinUniform.value.y, this._gainMapMinUniform.value.z]
  }

  set gainMapMin (value: [number, number, number]) {
    this._gainMapMinUniform.value.x = value[0]
    this._gainMapMinUniform.value.y = value[1]
    this._gainMapMinUniform.value.z = value[2]
  }

  /**
   * @see {@link GainMapMetadata.gainMapMax}
   */
  get gainMapMax (): [number, number, number] {
    return [this._gainMapMaxUniform.value.x, this._gainMapMaxUniform.value.y, this._gainMapMaxUniform.value.z]
  }

  set gainMapMax (value: [number, number, number]) {
    this._gainMapMaxUniform.value.x = value[0]
    this._gainMapMaxUniform.value.y = value[1]
    this._gainMapMaxUniform.value.z = value[2]
  }

  /**
   * @see {@link GainMapMetadata.gamma}
   */
  get gamma (): [number, number, number] {
    return [1 / this._gammaUniform.value.x, 1 / this._gammaUniform.value.y, 1 / this._gammaUniform.value.z]
  }

  set gamma (value: [number, number, number]) {
    this._gammaUniform.value.x = 1.0 / value[0]
    this._gammaUniform.value.y = 1.0 / value[1]
    this._gammaUniform.value.z = 1.0 / value[2]
  }

  /**
   * @see {@link GainMapMetadata.hdrCapacityMin}
   * @remarks Logarithmic space
   */
  get hdrCapacityMin () { return this._hdrCapacityMin }
  set hdrCapacityMin (value: number) {
    this._hdrCapacityMin = value
    this.calculateWeight()
  }

  /**
   * @see {@link GainMapMetadata.hdrCapacityMax}
   * @remarks Logarithmic space
   */
  get hdrCapacityMax () { return this._hdrCapacityMax }
  set hdrCapacityMax (value: number) {
    this._hdrCapacityMax = value
    this.calculateWeight()
  }

  /**
   * @see {@link GainmapDecodingParameters.maxDisplayBoost}
   * @remarks Non Logarithmic space
   */
  get maxDisplayBoost () { return this._maxDisplayBoost }
  set maxDisplayBoost (value: number) {
    this._maxDisplayBoost = Math.max(1, Math.min(65504, value))
    this.calculateWeight()
  }

  private calculateWeight () {
    const val = (Math.log2(this._maxDisplayBoost) - this._hdrCapacityMin) / (this._hdrCapacityMax - this._hdrCapacityMin)
    this._weightFactorUniform.value = Math.max(0, Math.min(1, val))
  }
}
