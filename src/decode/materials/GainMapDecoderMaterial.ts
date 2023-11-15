import { NoBlending, ShaderMaterial, Texture, Vector3 } from 'three'

import { GainMapMetadata } from '../../core/types'
import { GainmapDecodingParameters } from '../types'

const vertexShader = /* glsl */`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */`
// min half float value
#define HALF_FLOAT_MIN vec3( -65504, -65504, -65504 )
// max half float value
#define HALF_FLOAT_MAX vec3( 65504, 65504, 65504 )

uniform sampler2D sdr;
uniform sampler2D gainMap;
uniform vec3 gamma;
uniform vec3 offsetHdr;
uniform vec3 offsetSdr;
uniform vec3 gainMapMin;
uniform vec3 gainMapMax;
uniform float weightFactor;

varying vec2 vUv;

void main() {
  vec3 rgb = texture2D( sdr, vUv ).rgb;
  vec3 recovery = texture2D( gainMap, vUv ).rgb;
  vec3 logRecovery = pow( recovery, gamma );
  vec3 logBoost = gainMapMin * ( 1.0 - logRecovery ) + gainMapMax * logRecovery;
  vec3 hdrColor = (rgb + offsetSdr) * exp2( logBoost * weightFactor ) - offsetHdr;
  vec3 clampedHdrColor = max( HALF_FLOAT_MIN, min( HALF_FLOAT_MAX, hdrColor ));
  gl_FragColor = vec4( clampedHdrColor , 1.0 );
}
`
/**
 * A Material which is able to decode the Gainmap into a full HDR Representation
 *
 * @category Materials
 * @group Materials
 */
export class GainMapDecoderMaterial extends ShaderMaterial {
  private _maxDisplayBoost: GainmapDecodingParameters['maxDisplayBoost']
  private _hdrCapacityMin: GainMapMetadata['hdrCapacityMin']
  private _hdrCapacityMax: GainMapMetadata['hdrCapacityMax']
  /**
   *
   * @param params
   */
  constructor ({ gamma, offsetHdr, offsetSdr, gainMapMin, gainMapMax, maxDisplayBoost, hdrCapacityMin, hdrCapacityMax, sdr, gainMap }: GainMapMetadata & GainmapDecodingParameters & { sdr: Texture, gainMap: Texture }) {
    super({
      name: 'GainMapDecoderMaterial',
      vertexShader,
      fragmentShader,
      uniforms: {
        sdr: { value: sdr },
        gainMap: { value: gainMap },
        gamma: { value: new Vector3(1.0 / gamma[0], 1.0 / gamma[1], 1.0 / gamma[2]) },
        offsetHdr: { value: new Vector3().fromArray(offsetHdr) },
        offsetSdr: { value: new Vector3().fromArray(offsetSdr) },
        gainMapMin: { value: new Vector3().fromArray(gainMapMin) },
        gainMapMax: { value: new Vector3().fromArray(gainMapMax) },
        weightFactor: {
          value: (Math.log2(maxDisplayBoost) - hdrCapacityMin) / (hdrCapacityMax - hdrCapacityMin)
        }
      },
      blending: NoBlending,
      depthTest: false,
      depthWrite: false
    })

    this._maxDisplayBoost = maxDisplayBoost
    this._hdrCapacityMin = hdrCapacityMin
    this._hdrCapacityMax = hdrCapacityMax

    this.needsUpdate = true
    this.uniformsNeedUpdate = true
  }

  get sdr () { return this.uniforms.sdr.value as Texture }
  set sdr (value: Texture) { this.uniforms.sdr.value = value }

  get gainMap () { return this.uniforms.gainMap.value as Texture }
  set gainMap (value: Texture) { this.uniforms.gainMap.value = value }
  /**
   * @see {@link GainMapMetadata.offsetHdr}
   */
  get offsetHdr () { return (this.uniforms.offsetHdr.value as Vector3).toArray() }
  set offsetHdr (value: [number, number, number]) { (this.uniforms.offsetHdr.value as Vector3).fromArray(value) }
  /**
   * @see {@link GainMapMetadata.offsetSdr}
   */
  get offsetSdr () { return (this.uniforms.offsetSdr.value as Vector3).toArray() }
  set offsetSdr (value: [number, number, number]) { (this.uniforms.offsetSdr.value as Vector3).fromArray(value) }
  /**
   * @see {@link GainMapMetadata.gainMapMin}
   */
  get gainMapMin () { return (this.uniforms.gainMapMin.value as Vector3).toArray() }
  set gainMapMin (value: [number, number, number]) { (this.uniforms.gainMapMin.value as Vector3).fromArray(value) }
  /**
   * @see {@link GainMapMetadata.gainMapMax}
   */
  get gainMapMax () { return (this.uniforms.gainMapMax.value as Vector3).toArray() }
  set gainMapMax (value: [number, number, number]) { (this.uniforms.gainMapMax.value as Vector3).fromArray(value) }

  /**
   * @see {@link GainMapMetadata.gamma}
   */
  get gamma () {
    const g = (this.uniforms.gamma.value as Vector3)
    return [1 / g.x, 1 / g.y, 1 / g.z] as [number, number, number]
  }

  set gamma (value: [number, number, number]) {
    const g = (this.uniforms.gamma.value as Vector3)
    g.x = 1.0 / value[0]
    g.y = 1.0 / value[1]
    g.z = 1.0 / value[2]
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
   * @see {@link GainMapMetadata.hdrCapacityMin}
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
    this.uniforms.weightFactor.value = Math.max(0, Math.min(1, val))
  }
}
