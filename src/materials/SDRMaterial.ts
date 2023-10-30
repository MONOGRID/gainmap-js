import { NoBlending, ShaderMaterial, Texture } from 'three'

const vertexShader = /* glsl */`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */`
#ifndef saturate
// <tonemapping_pars_fragment> may have defined saturate() already
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif

uniform sampler2D map;
uniform float brightness;
uniform float contrast;
uniform float saturation;
uniform float exposure;

varying vec2 vUv;

mat4 brightnessMatrix( float brightness ) {
  return mat4(
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    brightness, brightness, brightness, 1
  );
}

mat4 contrastMatrix( float contrast ) {
  float t = ( 1.0 - contrast ) / 2.0;
  return mat4(
    contrast, 0, 0, 0,
    0, contrast, 0, 0,
    0, 0, contrast, 0,
    t, t, t, 1
  );
}

mat4 saturationMatrix( float saturation ) {
  vec3 luminance = vec3( 0.3086, 0.6094, 0.0820 );
  float oneMinusSat = 1.0 - saturation;
  vec3 red = vec3( luminance.x * oneMinusSat );
  red+= vec3( saturation, 0, 0 );
  vec3 green = vec3( luminance.y * oneMinusSat );
  green += vec3( 0, saturation, 0 );
  vec3 blue = vec3( luminance.z * oneMinusSat );
  blue += vec3( 0, 0, saturation );
  return mat4(
    red,     0,
    green,   0,
    blue,    0,
    0, 0, 0, 1
  );
}

void main() {
  vec4 color = saturate(exposure * texture2D(map, vUv));

  gl_FragColor =
    brightnessMatrix( brightness ) *
    contrastMatrix( contrast ) *
    saturationMatrix( saturation ) *
    color;
}
`
/**
 * A Material used to adjust the SDR representation of an HDR image
 *
 * @category Materials
 * @group Materials
 */
export class SDRMaterial extends ShaderMaterial {
  private _brightness: number = 0
  private _contrast: number = 1
  private _saturation: number = 1
  private _exposure: number = 1
  private _map: Texture
  /**
   *
   * @param params
   */
  constructor ({ map }: { map: Texture }) {
    super({
      name: 'SDRMaterial',
      vertexShader,
      fragmentShader,
      uniforms: {
        map: { value: map },
        brightness: { value: 0 },
        contrast: { value: 1 },
        saturation: { value: 1 },
        exposure: { value: 1 }
      },
      blending: NoBlending,
      depthTest: false,
      depthWrite: false
    })

    this._map = map

    this.needsUpdate = true
    this.uniformsNeedUpdate = true
  }

  get brightness () { return this._brightness }
  set brightness (value: number) {
    this._brightness = value
    this.uniforms.brightness.value = value
  }

  get contrast () { return this._contrast }
  set contrast (value: number) {
    this._contrast = value
    this.uniforms.contrast.value = value
  }

  get saturation () { return this._saturation }
  set saturation (value: number) {
    this._saturation = value
    this.uniforms.saturation.value = value
  }

  get exposure () { return this._exposure }
  set exposure (value: number) {
    this._exposure = value
    this.uniforms.exposure.value = value
  }

  get map () { return this._map }
  set map (value: Texture) {
    this._map = value
    this.uniforms.map.value = value
  }
}
