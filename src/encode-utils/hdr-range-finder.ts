'use strict'

import { ClampToEdgeWrapping, NearestFilter, Texture, WebGLRenderTarget } from 'three'
const vertexShader = /* glsl */`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */`
precision mediump float;

// #define CELL_SIZE $(cellSize)s

uniform sampler2D u_texture;
uniform vec2 u_srcResolution;
uniform vec2 u_dstResolution;

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

export const find = (srcTex: Texture) => {
  const cellSize = 2

  const uniforms = {
    u_srcResolution: { value: [srcTex.image.width, srcTex.image.height] },
    u_dstResolution: { value: [srcTex.image.width, srcTex.image.height] },
    u_texture: { value: srcTex }
  }
  // const mat = new RawShaderMaterial({
  //   vertexShader,
  //   fragmentShader,
  //   uniforms: {
  //     u_srcResolution: { value: [srcTex.image.width, srcTex.image.height] },
  //     u_texture: { value: srcTex }
  //   }
  // })

  const framebuffers: WebGLRenderTarget[] = []
  let w = srcTex.image.width
  let h = srcTex.image.height
  while (w > 1 || h > 1) {
    w = Math.max(1, (w + cellSize - 1) / cellSize | 0)
    h = Math.max(1, (h + cellSize - 1) / cellSize | 0)

    const fb = new WebGLRenderTarget(w, h, { minFilter: NearestFilter, magFilter: NearestFilter, wrapS: ClampToEdgeWrapping, wrapT: ClampToEdgeWrapping })
    // creates a framebuffer and creates and attaches an RGBA/UNSIGNED texture
    // const fb = twgl.createFramebufferInfo(gl, [
    //   { min: gl.NEAREST, max: gl.NEAREST, wrap: gl.CLAMP_TO_EDGE }
    // ], w, h)
    framebuffers.push(fb)
  }

  w = srcTex.image.width
  h = srcTex.image.height
  framebuffers.forEach((fbi, ndx) => {
    w = Math.max(1, (w + cellSize - 1) / cellSize | 0)
    h = Math.max(1, (h + cellSize - 1) / cellSize | 0)
    // uniforms.u_dstResolution = [w, h]
    // twgl.bindFramebufferInfo(gl, fbi)
    // twgl.setUniforms(programInfo, uniforms)
    // twgl.drawBufferInfo(gl, unitQuadBufferInfo)

    // uniforms.u_texture = fbi.attachments[0]
    // uniforms.u_srcResolution = [w, h]
  })
}

// make a texture as our source
const ctx = document.createElement('canvas').getContext('2d')
ctx.fillStyle = 'rgb(12, 34, 56)'
ctx.fillRect(20, 30, 1, 1)
ctx.fillStyle = 'rgb(254, 243, 32)'
ctx.fillRect(270, 140, 1, 1)

const canvas = document.createElement('canvas')
const m4 = twgl.m4
const gl = canvas.getContext('webgl')
const fsSrc = document.getElementById('max-fs').text.replace('$(cellSize)s', cellSize)
const programInfo = twgl.createProgramInfo(gl, ['vs', fsSrc])

const unitQuadBufferInfo = twgl.primitives.createXYQuadBufferInfo(gl)
const framebufferInfo = twgl.createFramebufferInfo(gl)

const srcTex = twgl.createTexture(gl, {
  src: ctx.canvas,
  min: gl.NEAREST,
  mag: gl.NEAREST,
  wrap: gl.CLAMP_TO_EDGE
})

const framebuffers = []
var w = ctx.canvas.width
var h = ctx.canvas.height
while (w > 1 || h > 1) {
  w = Math.max(1, (w + cellSize - 1) / cellSize | 0)
  h = Math.max(1, (h + cellSize - 1) / cellSize | 0)
  // creates a framebuffer and creates and attaches an RGBA/UNSIGNED texture
  const fb = twgl.createFramebufferInfo(gl, [
    { min: gl.NEAREST, max: gl.NEAREST, wrap: gl.CLAMP_TO_EDGE }
  ], w, h)
  framebuffers.push(fb)
}

const uniforms = {
  u_srcResolution: [ctx.canvas.width, ctx.canvas.height],
  u_texture: srcTex
}

gl.useProgram(programInfo.program)
twgl.setBuffersAndAttributes(gl, programInfo, unitQuadBufferInfo)

var w = ctx.canvas.width
var h = ctx.canvas.height
framebuffers.forEach(function (fbi, ndx) {
  w = Math.max(1, (w + cellSize - 1) / cellSize | 0)
  h = Math.max(1, (h + cellSize - 1) / cellSize | 0)
  uniforms.u_dstResolution = [w, h]
  twgl.bindFramebufferInfo(gl, fbi)
  twgl.setUniforms(programInfo, uniforms)
  twgl.drawBufferInfo(gl, unitQuadBufferInfo)

  uniforms.u_texture = fbi.attachments[0]
  uniforms.u_srcResolution = [w, h]
})

const p = new Uint8Array(4)
gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p)
log('max: ', p[0], p[1], p[2])

function log () {
  const elem = document.createElement('pre')
  elem.appendChild(document.createTextNode(Array.prototype.join.call(arguments, ' ')))
  document.body.appendChild(elem)
}
