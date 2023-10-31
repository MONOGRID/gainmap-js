import { NoBlending, ShaderMaterial, Texture, Vector3 } from 'three'

import { GainmapDecodingParameters, GainMapMetadata } from '../types'

const vertexShader = /* glsl */`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */`
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
  vec3 rgb = texture2D(sdr, vUv).rgb;
  vec3 recovery = texture2D(gainMap, vUv).rgb;
  vec3 logRecovery = pow(recovery, gamma);
  vec3 logBoost = gainMapMin * (1.0 - logRecovery) + gainMapMax * logRecovery;
  vec3 hdrColor = (rgb + offsetSdr) * exp2(logBoost * weightFactor) - offsetHdr;
  gl_FragColor = vec4(hdrColor, 1.0);
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
        offsetHdr: { value: new Vector3(offsetHdr[0], offsetHdr[1], offsetHdr[2]) },
        offsetSdr: { value: new Vector3(offsetSdr[0], offsetSdr[1], offsetSdr[2]) },
        gainMapMin: { value: new Vector3(gainMapMin[0], gainMapMin[1], gainMapMin[2]) },
        gainMapMax: { value: new Vector3(gainMapMax[0], gainMapMax[1], gainMapMax[2]) },
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

  /**
   * @see {@link GainmapDecodingParameters}
   */
  get maxDisplayBoost () { return this._maxDisplayBoost }
  set maxDisplayBoost (value: number) {
    this._maxDisplayBoost = value
    this.uniforms.weightFactor.value = (Math.log2(this._maxDisplayBoost) - this._hdrCapacityMin) / (this._hdrCapacityMax - this._hdrCapacityMin)
  }
}
