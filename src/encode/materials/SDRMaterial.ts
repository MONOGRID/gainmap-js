import { ACESFilmicToneMapping, CineonToneMapping, LinearToneMapping, NoBlending, ReinhardToneMapping, ShaderMaterial, Texture, ToneMapping } from 'three'

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

vec3 RRTAndODTFit( vec3 v ) {
  vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
  vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
  return a / b;
}

vec3 ACESFilmicToneMapping( vec3 color ) {
  // sRGB => XYZ => D65_2_D60 => AP1 => RRT_SAT
  const mat3 ACESInputMat = mat3(
    vec3( 0.59719, 0.07600, 0.02840 ), // transposed from source
    vec3( 0.35458, 0.90834, 0.13383 ),
    vec3( 0.04823, 0.01566, 0.83777 )
  );
  // ODT_SAT => XYZ => D60_2_D65 => sRGB
  const mat3 ACESOutputMat = mat3(
    vec3(  1.60475, -0.10208, -0.00327 ), // transposed from source
    vec3( -0.53108,  1.10813, -0.07276 ),
    vec3( -0.07367, -0.00605,  1.07602 )
  );
  color = ACESInputMat * color;
  // Apply RRT and ODT
  color = RRTAndODTFit( color );
  color = ACESOutputMat * color;
  // Clamp to [0, 1]
  return saturate( color );
}

// source: https://www.cs.utah.edu/docs/techreports/2002/pdf/UUCS-02-001.pdf
vec3 ReinhardToneMapping( vec3 color ) {
  return saturate( color / ( vec3( 1.0 ) + color ) );
}

// source: http://filmicworlds.com/blog/filmic-tonemapping-operators/
vec3 CineonToneMapping( vec3 color ) {
  // optimized filmic operator by Jim Hejl and Richard Burgess-Dawson
  color = max( vec3( 0.0 ), color - 0.004 );
  return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}

// nothing
vec3 LinearToneMapping ( vec3 color ) {
  return color;
}


void main() {
  vec4 color = texture2D(map, vUv);

  vec4 exposed = vec4(exposure * color.rgb, color.a);

  vec4 tonemapped = vec4(TONEMAPPING_FUNCTION(exposed.rgb), color.a);

  vec4 adjusted =
    brightnessMatrix( brightness ) *
    contrastMatrix( contrast ) *
    saturationMatrix( saturation ) *
    tonemapped;

  gl_FragColor = adjusted;
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
  private _toneMapping: ToneMapping
  private _map: Texture
  /**
   *
   * @param params
   */
  constructor ({ map, toneMapping }: { map: Texture, toneMapping?: ToneMapping }) {
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
    this.toneMapping = this._toneMapping = toneMapping || ACESFilmicToneMapping
    this.needsUpdate = true
    this.uniformsNeedUpdate = true
  }

  get toneMapping () { return this._toneMapping }
  set toneMapping (value: ToneMapping) {
    let valid = false
    switch (value) {
      case ACESFilmicToneMapping:
        this.defines.TONEMAPPING_FUNCTION = 'ACESFilmicToneMapping'
        valid = true
        break
      case ReinhardToneMapping:
        this.defines.TONEMAPPING_FUNCTION = 'ReinhardToneMapping'
        valid = true
        break
      case CineonToneMapping:
        this.defines.TONEMAPPING_FUNCTION = 'CineonToneMapping'
        valid = true
        break
      case LinearToneMapping:
        this.defines.TONEMAPPING_FUNCTION = 'LinearToneMapping'
        valid = true
        break
      default:
        console.error(`Unsupported toneMapping: ${value}. Using LinearToneMapping.`)
        this.defines.TONEMAPPING_FUNCTION = 'LinearToneMapping'
        this._toneMapping = LinearToneMapping
    }
    if (valid) {
      this._toneMapping = value
    }
    this.needsUpdate = true
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
