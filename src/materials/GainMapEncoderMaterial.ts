import { NoBlending, ShaderMaterial, Texture, Vector3 } from 'three'

const vertexShader = /* glsl */`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */`
uniform sampler2D sdr;
uniform sampler2D hdr;
uniform vec3 gamma;
uniform vec3 offsetSdr;
uniform vec3 offsetHdr;
uniform vec3 minLog2;
uniform vec3 maxLog2;

varying vec2 vUv;

void main() {
  vec3 sdrColor = texture2D(sdr, vUv).rgb;
  vec3 hdrColor = texture2D(hdr, vUv).rgb;

  vec3 pixelGain = (hdrColor + offsetHdr) / (sdrColor + offsetSdr);
  vec3 logRecovery = (log2(pixelGain) - minLog2) / (maxLog2 - minLog2);
  vec3 clampedRecovery = saturate(logRecoveryR);
  gl_FragColor = vec4(pow(clampedRecovery, gamma), 1.0);
}
`
/**
 * A Material which is able to encode a gainmap
 *
 * @category Materials
 * @group Materials
 */
export class GainMapEncoderMaterial extends ShaderMaterial {
  private _minContentBoost: number
  private _maxContentBoost: number
  private _offsetSdr: Vector3
  private _offsetHdr: Vector3
  private _gamma: Vector3
  /**
   *
   * @param params
   */
  constructor ({ sdr, hdr, offsetSdr, offsetHdr, maxContentBoost, minContentBoost, gamma }: { maxContentBoost: number, minContentBoost: number, gamma: Vector3, offsetSdr: Vector3, offsetHdr: Vector3, sdr: Texture, hdr: Texture }) {
    super({
      name: 'GainMapEncoderMaterial',
      vertexShader,
      fragmentShader,
      uniforms: {
        sdr: { value: sdr },
        hdr: { value: hdr },
        gamma: { value: gamma },
        offsetSdr: { value: offsetSdr },
        offsetHdr: { value: offsetHdr },
        minLog2: { value: Math.log2(minContentBoost) },
        maxLog2: { value: Math.log2(maxContentBoost) }
      },
      blending: NoBlending,
      depthTest: false,
      depthWrite: false
    })

    this._minContentBoost = minContentBoost
    this._maxContentBoost = maxContentBoost
    this._offsetSdr = offsetSdr
    this._offsetHdr = offsetHdr
    this._gamma = gamma

    this.needsUpdate = true
    this.uniformsNeedUpdate = true
  }

  get gamma () { return this._gamma }
  set gamma (value: Vector3) {
    this._gamma = value
    this.uniforms.gamma.value = value
  }

  get offsetHdr () { return this._offsetHdr }
  set offsetHdr (value: Vector3) {
    this._offsetHdr = value
    this.uniforms.offsetHdr.value = value
  }

  get offsetSdr () { return this._offsetSdr }
  set offsetSdr (value: Vector3) {
    this._offsetSdr = value
    this.uniforms.offsetSdr.value = value
  }

  get minContentBoost () { return this._minContentBoost }
  set minContentBoost (value: number) {
    this._minContentBoost = value
    this.uniforms.minLog2.value = Math.log2(value)
  }

  get maxContentBoost () { return this._maxContentBoost }
  set maxContentBoost (value: number) {
    this._maxContentBoost = value
    this.uniforms.maxLog2.value = Math.log2(value)
  }
}
