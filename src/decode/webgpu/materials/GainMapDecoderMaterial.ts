import { add, exp2, float, max, min, mul, pow, sub, texture, uniform, vec3 } from 'three/tsl'
import { MeshBasicNodeMaterial, NoBlending, Texture, Vector3 } from 'three/webgpu'

import { GainMapMetadata } from '../../../core/types'
import { type GainmapDecodingParameters } from '../../core'

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
  private _gammaUniform: ReturnType<typeof uniform<Vector3>>
  private _offsetHdrUniform: ReturnType<typeof uniform<Vector3>>
  private _offsetSdrUniform: ReturnType<typeof uniform<Vector3>>
  private _gainMapMinUniform: ReturnType<typeof uniform<Vector3>>
  private _gainMapMaxUniform: ReturnType<typeof uniform<Vector3>>
  private _weightFactorUniform: ReturnType<typeof uniform<number>>
  private _sdrTexture: Texture
  private _gainMapTexture: Texture

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

    this._sdrTexture = sdr
    this._gainMapTexture = gainMap

    // Create uniform nodes
    this._gammaUniform = uniform(vec3(1.0 / gamma[0], 1.0 / gamma[1], 1.0 / gamma[2]))
    this._offsetHdrUniform = uniform(vec3(offsetHdr[0], offsetHdr[1], offsetHdr[2]))
    this._offsetSdrUniform = uniform(vec3(offsetSdr[0], offsetSdr[1], offsetSdr[2]))
    this._gainMapMinUniform = uniform(vec3(gainMapMin[0], gainMapMin[1], gainMapMin[2]))
    this._gainMapMaxUniform = uniform(vec3(gainMapMax[0], gainMapMax[1], gainMapMax[2]))

    const weightFactor = (Math.log2(maxDisplayBoost) - hdrCapacityMin) / (hdrCapacityMax - hdrCapacityMin)
    this._weightFactorUniform = uniform(weightFactor)

    this._maxDisplayBoost = maxDisplayBoost
    this._hdrCapacityMin = hdrCapacityMin
    this._hdrCapacityMax = hdrCapacityMax

    // Build the TSL shader graph
    this._buildShader()
  }

  private _buildShader () {
    // Sample textures
    const sdrColor = texture(this._sdrTexture)
    const gainMapColor = texture(this._gainMapTexture)

    // Get RGB values
    const rgb = sdrColor.rgb
    const recovery = gainMapColor.rgb

    // Apply gamma correction
    const logRecovery = pow(recovery, this._gammaUniform)

    // Calculate log boost
    // logBoost = gainMapMin * (1.0 - logRecovery) + gainMapMax * logRecovery
    const oneMinusLogRecovery = sub(float(1.0), logRecovery)
    const logBoost = add(
      mul(this._gainMapMinUniform, oneMinusLogRecovery),
      mul(this._gainMapMaxUniform, logRecovery)
    )

    // Calculate HDR color
    // hdrColor = (rgb + offsetSdr) * exp2(logBoost * weightFactor) - offsetHdr
    const hdrColor = sub(
      mul(
        add(rgb, this._offsetSdrUniform),
        exp2(mul(logBoost, this._weightFactorUniform))
      ),
      this._offsetHdrUniform
    )

    // Clamp to half float range
    const clampedHdrColor = max(HALF_FLOAT_MIN, min(HALF_FLOAT_MAX, hdrColor))

    // Set the color output
    this.colorNode = clampedHdrColor
  }

  get sdr () { return this._sdrTexture }
  set sdr (value: Texture) {
    this._sdrTexture = value
    this._buildShader()
  }

  get gainMap () { return this._gainMapTexture }
  set gainMap (value: Texture) {
    this._gainMapTexture = value
    this._buildShader()
  }

  /**
   * @see {@link GainMapMetadata.offsetHdr}
   */
  get offsetHdr (): [number, number, number] {
    return [(this._offsetHdrUniform.value).x, (this._offsetHdrUniform.value).y, (this._offsetHdrUniform.value).z]
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
