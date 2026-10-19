import { NoBlending, ShaderMaterial, Texture, Vector3 } from 'three'

import { GainMapMetadata } from '../../core/types' // needed for docs
import { GainmapEncodingParameters } from '../types'

const vertexShader = /* glsl */`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */`
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform sampler2D sdr;
uniform sampler2D hdr;
uniform vec3 gamma;
uniform vec3 offsetSdr;
uniform vec3 offsetHdr;
uniform float minLog2;
uniform float maxLog2;

varying vec2 vUv;

void main() {
  vec3 sdrColor = texture2D(sdr, vUv).rgb;
  vec3 hdrColor = texture2D(hdr, vUv).rgb;

  vec3 pixelGain = (hdrColor + offsetHdr) / (sdrColor + offsetSdr);
  vec3 logRecovery = (log2(pixelGain) - minLog2) / (maxLog2 - minLog2);
  vec3 clampedRecovery = saturate(logRecovery);
  gl_FragColor = vec4(pow(clampedRecovery, gamma), 1.0);
}
`
// maxContentBoost must be > 1, a gain map can't encode an empty boost range
const MIN_MAX_CONTENT_BOOST = 1.0001

const warnNoHDRContent = (maxContentBoost: number) => {
  console.warn(`gainmap-js: maxContentBoost is ${maxContentBoost} (<= 1), the source image has no HDR content. It will be clamped to ${MIN_MAX_CONTENT_BOOST} and the result will be equivalent to an SDR image.`)
}

const warnEmptyRange = (minContentBoost: number, maxContentBoost: number) => {
  console.warn(`gainmap-js: minContentBoost (${minContentBoost}) must be lower than maxContentBoost (${maxContentBoost}), the resulting gain map will be invalid.`)
}

/**
 * A Material which is able to encode a gainmap
 *
 * @deprecated Will be removed in v4.0.0. Use `GainMapEncoderNode` from `@monogrid/gainmap-js/encode/webgpu` with `WebGPURenderer` (which also has a WebGL2 backend) instead: it is **not a drop-in replacement**, it returns live TSL texture nodes, read back asynchronously, see the [migration guide](https://github.com/MONOGRID/gainmap-js#migrating-to-v400).
 *
 * @category Materials
 * @group Materials
 */
export class GainMapEncoderMaterial extends ShaderMaterial {
  private _minContentBoost: number
  private _maxContentBoost: number
  private _offsetSdr: [number, number, number]
  private _offsetHdr: [number, number, number]
  private _gamma: [number, number, number]
  /**
   *
   * @param params
   */
  constructor ({ sdr, hdr, offsetSdr, offsetHdr, maxContentBoost, minContentBoost, gamma }: { sdr: Texture, hdr: Texture } & GainmapEncodingParameters) {
    if (!maxContentBoost) throw new Error('maxContentBoost is required')
    if (!sdr) throw new Error('sdr is required')
    if (!hdr) throw new Error('hdr is required')

    const _gamma = gamma || [1, 1, 1]
    const _offsetSdr = offsetSdr || [1 / 64, 1 / 64, 1 / 64]
    const _offsetHdr = offsetHdr || [1 / 64, 1 / 64, 1 / 64]
    if (maxContentBoost <= 1) warnNoHDRContent(maxContentBoost)
    const _minContentBoost = minContentBoost || 1
    const _maxContentBoost = Math.max(maxContentBoost, MIN_MAX_CONTENT_BOOST)
    if (_minContentBoost >= _maxContentBoost) warnEmptyRange(_minContentBoost, _maxContentBoost)

    super({
      name: 'GainMapEncoderMaterial',
      vertexShader,
      fragmentShader,
      uniforms: {
        sdr: { value: sdr },
        hdr: { value: hdr },
        gamma: { value: new Vector3().fromArray(_gamma) },
        offsetSdr: { value: new Vector3().fromArray(_offsetSdr) },
        offsetHdr: { value: new Vector3().fromArray(_offsetHdr) },
        minLog2: { value: Math.log2(_minContentBoost) },
        maxLog2: { value: Math.log2(_maxContentBoost) }
      },
      blending: NoBlending,
      depthTest: false,
      depthWrite: false
    })

    this._minContentBoost = _minContentBoost
    this._maxContentBoost = _maxContentBoost
    this._offsetSdr = _offsetSdr
    this._offsetHdr = _offsetHdr
    this._gamma = _gamma

    this.needsUpdate = true
    this.uniformsNeedUpdate = true
  }

  /**
   * @see {@link GainmapEncodingParameters.gamma}
   */
  get gamma () { return this._gamma }
  set gamma (value: [number, number, number]) {
    this._gamma = value
    this.uniforms.gamma.value = new Vector3().fromArray(value)
  }

  /**
   * @see {@link GainmapEncodingParameters.offsetHdr}
   */
  get offsetHdr () { return this._offsetHdr }
  set offsetHdr (value: [number, number, number]) {
    this._offsetHdr = value
    this.uniforms.offsetHdr.value = new Vector3().fromArray(value)
  }

  /**
   * @see {@link GainmapEncodingParameters.offsetSdr}
   */
  get offsetSdr () { return this._offsetSdr }
  set offsetSdr (value: [number, number, number]) {
    this._offsetSdr = value
    this.uniforms.offsetSdr.value = new Vector3().fromArray(value)
  }

  /**
   * @see {@link GainmapEncodingParameters.minContentBoost}
   * @remarks Non logarithmic space
   */
  get minContentBoost () { return this._minContentBoost }
  set minContentBoost (value: number) {
    if (value >= this._maxContentBoost) warnEmptyRange(value, this._maxContentBoost)
    this._minContentBoost = value
    this.uniforms.minLog2.value = Math.log2(value)
  }

  /**
   * @see {@link GainmapEncodingParameters.maxContentBoost}
   * @remarks Non logarithmic space
   */
  get maxContentBoost () { return this._maxContentBoost }
  set maxContentBoost (value: number) {
    if (value <= 1) warnNoHDRContent(value)
    const _value = Math.max(value, MIN_MAX_CONTENT_BOOST)
    if (this._minContentBoost >= _value) warnEmptyRange(this._minContentBoost, _value)
    this._maxContentBoost = _value
    this.uniforms.maxLog2.value = Math.log2(_value)
  }

  /**
   * @see {@link GainMapMetadata.gainMapMin}
   * @remarks Logarithmic space
   */
  get gainMapMin (): [number, number, number] { return [Math.log2(this._minContentBoost), Math.log2(this._minContentBoost), Math.log2(this._minContentBoost)] }
  /**
   * @see {@link GainMapMetadata.gainMapMax}
   * @remarks Logarithmic space
   */
  get gainMapMax (): [number, number, number] { return [Math.log2(this._maxContentBoost), Math.log2(this._maxContentBoost), Math.log2(this._maxContentBoost)] }

  /**
   * @see {@link GainMapMetadata.hdrCapacityMin}
   * @remarks Logarithmic space
   */
  get hdrCapacityMin (): number { return Math.min(Math.max(0, this.gainMapMin[0]), Math.max(0, this.gainMapMin[1]), Math.max(0, this.gainMapMin[2])) }
  /**
   * @see {@link GainMapMetadata.hdrCapacityMax}
   * @remarks Logarithmic space
   */
  get hdrCapacityMax (): number { return Math.max(Math.max(0, this.gainMapMax[0]), Math.max(0, this.gainMapMax[1]), Math.max(0, this.gainMapMax[2])) }
}
