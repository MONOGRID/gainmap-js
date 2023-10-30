'use strict'

import { ClampToEdgeWrapping, HalfFloatType, NearestFilter, NoColorSpace, ShaderMaterial, Texture, WebGLRenderTarget } from 'three'

import { QuadRenderer } from '../utils/QuadRenderer'
const vertexShader = /* glsl */`

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */`
precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_srcResolution;

void main() {
  // compute the first pixel the source cell
  vec2 srcPixel = floor(gl_FragCoord.xy) * float(CELL_SIZE);

  // one pixel in source
  vec2 onePixel = vec2(1) / u_srcResolution;

  // uv for first pixel in cell. +0.5 for center of pixel
  vec2 uv = (srcPixel + 0.5) * onePixel;

  vec4 maxColor = vec4(0);
  for (int y = 0; y < CELL_SIZE; ++y) {
    for (int x = 0; x < CELL_SIZE; ++x) {
      maxColor = max(maxColor, texture2D(u_texture, uv + vec2(x, y) * onePixel));
    }
  }

  gl_FragColor = maxColor;
}
`

export const findTextureMax = (srcTex: Texture) => {
  const cellSize = 2

  const mat = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      u_srcResolution: { value: [srcTex.image.width, srcTex.image.height] },
      u_texture: { value: srcTex }
    },
    defines: {
      CELL_SIZE: cellSize
    }
  })

  let w = srcTex.image.width
  let h = srcTex.image.height

  const quadRenderer = new QuadRenderer(w, h, HalfFloatType, NoColorSpace, mat)

  const framebuffers: WebGLRenderTarget[] = []

  while (w > 1 || h > 1) {
    w = Math.max(1, (w + cellSize - 1) / cellSize | 0)
    h = Math.max(1, (h + cellSize - 1) / cellSize | 0)
    const fb = new WebGLRenderTarget(w, h, {
      type: HalfFloatType,
      colorSpace: NoColorSpace,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
      generateMipmaps: false,
      depthBuffer: false,
      stencilBuffer: false
    })
    framebuffers.push(fb)
  }

  w = srcTex.image.width
  h = srcTex.image.height
  framebuffers.forEach((fbi) => {
    w = Math.max(1, (w + cellSize - 1) / cellSize | 0)
    h = Math.max(1, (h + cellSize - 1) / cellSize | 0)

    quadRenderer.renderTarget = fbi
    quadRenderer.render()

    const arr = quadRenderer.toArray()
    console.log(framebuffers, arr)

    mat.uniforms.u_texture.value = fbi.texture
    mat.uniforms.u_srcResolution.value = [w, h]
    mat.needsUpdate = true
  })

  const out = quadRenderer.toArray()
  return [out[0], out[1], out[2]]
}
