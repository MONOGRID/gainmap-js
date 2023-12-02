import {
  ClampToEdgeWrapping,
  DataTexture,
  DataUtils,
  FloatType,
  NearestFilter,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget
} from 'three'
import { EXR } from 'three/examples/jsm/loaders/EXRLoader'
import { LogLuv } from 'three/examples/jsm/loaders/LogLuvLoader'
import { RGBE } from 'three/examples/jsm/loaders/RGBELoader'

import { getDataTexture } from '../core/get-data-texture'
import { QuadRenderer } from '../core/QuadRenderer'
const vertexShader = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */`
precision mediump float;

#ifndef CELL_SIZE
  #define CELL_SIZE 2
#endif

#ifndef COMPARE_FUNCTION
  #define COMPARE_FUNCTION max
#endif

#ifndef INITIAL_VALUE
  #define INITIAL_VALUE 0
#endif

uniform sampler2D map;
uniform vec2 u_srcResolution;

varying vec2 vUv;

void main() {
  // compute the first pixel the source cell
  vec2 srcPixel = floor(gl_FragCoord.xy) * float(CELL_SIZE);

  // one pixel in source
  vec2 onePixel = vec2(1) / u_srcResolution;

  // uv for first pixel in cell. +0.5 for center of pixel
  vec2 uv = (srcPixel + 0.5) * onePixel;

  vec4 resultColor = vec4(INITIAL_VALUE);

  for (int y = 0; y < CELL_SIZE; ++y) {
    for (int x = 0; x < CELL_SIZE; ++x) {
      resultColor = COMPARE_FUNCTION(resultColor, texture2D(map, uv + vec2(x, y) * onePixel));
    }
  }

  gl_FragColor = resultColor;
}
`
/**
 *
 * @category Utility
 * @group Utility
 *
 * @param srcTex
 * @param mode
 * @param renderer
 * @returns
 */
export const findTextureMinMax = (image: EXR | RGBE | LogLuv | DataTexture, mode: 'min' | 'max' = 'max', renderer?: WebGLRenderer) => {
  const srcTex = getDataTexture(image)
  const cellSize = 2

  const mat = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      u_srcResolution: { value: new Vector2(srcTex.image.width, srcTex.image.height) },
      map: { value: srcTex }
    },
    defines: {
      CELL_SIZE: cellSize,
      COMPARE_FUNCTION: mode,
      INITIAL_VALUE: mode === 'max' ? 0 : 65504 // max half float value
    }
  })
  srcTex.needsUpdate = true
  mat.needsUpdate = true

  let w = srcTex.image.width
  let h = srcTex.image.height

  const quadRenderer = new QuadRenderer({
    width: w,
    height: h,
    type: srcTex.type,
    colorSpace: srcTex.colorSpace,
    material: mat,
    renderer
  })

  const frameBuffers: WebGLRenderTarget[] = []

  while (w > 1 || h > 1) {
    w = Math.max(1, (w + cellSize - 1) / cellSize | 0)
    h = Math.max(1, (h + cellSize - 1) / cellSize | 0)
    const fb = new WebGLRenderTarget(w, h, {
      type: quadRenderer.type,
      format: srcTex.format,
      colorSpace: quadRenderer.colorSpace,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
      generateMipmaps: false,
      depthBuffer: false,
      stencilBuffer: false
    })
    frameBuffers.push(fb)
  }

  w = srcTex.image.width
  h = srcTex.image.height
  frameBuffers.forEach((fbi) => {
    w = Math.max(1, (w + cellSize - 1) / cellSize | 0)
    h = Math.max(1, (h + cellSize - 1) / cellSize | 0)

    quadRenderer.renderTarget = fbi
    quadRenderer.render()

    mat.uniforms.map.value = fbi.texture
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mat.uniforms.u_srcResolution.value.x = w
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mat.uniforms.u_srcResolution.value.y = h
  })

  const out = quadRenderer.toArray()

  quadRenderer.dispose()
  frameBuffers.forEach(fb => fb.dispose())

  return [
    quadRenderer.type === FloatType ? out[0] : DataUtils.fromHalfFloat(out[0]),
    quadRenderer.type === FloatType ? out[1] : DataUtils.fromHalfFloat(out[1]),
    quadRenderer.type === FloatType ? out[2] : DataUtils.fromHalfFloat(out[2])
  ]
}
