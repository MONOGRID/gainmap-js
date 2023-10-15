import {
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  LinearMipMapLinearFilter,
  Mesh,
  NoBlending,
  NoColorSpace,
  NoToneMapping,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  UnsignedByteType,
  UVMapping,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget
} from 'three'

import { DecodeAsRenderTargetParameters, DecodeParameters } from './types'

const instantiateRenderer = () => {
  const renderer = new WebGLRenderer()
  renderer.debug.checkShaderErrors = false
  renderer.setSize(128, 128)
  renderer.toneMapping = NoToneMapping
  renderer.outputColorSpace = NoColorSpace

  return renderer
}

const cleanup = ({ renderer, renderTarget, destroyRenderer, material }: { renderer: WebGLRenderer, renderTarget?: WebGLRenderTarget, destroyRenderer: boolean, material: ShaderMaterial }) => {
  material.dispose()
  renderer.setRenderTarget(null)
  if (destroyRenderer) {
    renderer.dispose()
    renderer.forceContextLoss()
  }
  renderTarget?.dispose()
}

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
uniform sampler2D sdr;
uniform sampler2D gainMap;
uniform float mapGamma;
uniform float offsetHdr;
uniform float offsetSdr;
uniform vec3 gainMapMin;
uniform vec3 gainMapMax;
uniform vec3 weightFactor;

varying vec2 vUv;


void main() {
  vec3 rgb = texture2D(sdr, vUv).rgb;
  vec3 recovery = texture2D(gainMap, vUv).rgb;

  vec3 logRecovery = vec3(
    pow(recovery.r, mapGamma),
    pow(recovery.g, mapGamma),
    pow(recovery.b, mapGamma)
  );

  vec3 logBoost = gainMapMin * (1.0 - logRecovery) + gainMapMax * logRecovery;

  vec3 hdrColor = (rgb + offsetSdr) * exp2(logBoost * weightFactor) - offsetHdr;
  gl_FragColor = vec4(hdrColor, 1.0);
}
`

export const decode = <T extends DecodeParameters | DecodeAsRenderTargetParameters>({ sdr, gainMap, mapGamma, hdrCapacityMin, hdrCapacityMax, offsetHdr, offsetSdr, gainMapMin, gainMapMax, maxDisplayBoost, renderer, decodeAsRenderTarget }: T): T extends DecodeParameters ? Uint16Array : WebGLRenderTarget => {
  let _renderer = renderer
  let destroyRenderer = false
  if (!_renderer) {
    _renderer = instantiateRenderer()
    destroyRenderer = true
  }
  const scene = new Scene()

  const orthographicCamera = new OrthographicCamera()
  orthographicCamera.position.set(0, 0, 10)
  orthographicCamera.left = -0.5
  orthographicCamera.right = 0.5
  orthographicCamera.top = 0.5
  orthographicCamera.bottom = -0.5
  orthographicCamera.updateProjectionMatrix()

  let renderError: string | undefined

  const renderTarget = new WebGLRenderTarget(sdr.width, sdr.height, {
    type: HalfFloatType,
    colorSpace: NoColorSpace,
    format: RGBAFormat,
    magFilter: LinearFilter,
    minFilter: decodeAsRenderTarget ? LinearMipMapLinearFilter : LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: decodeAsRenderTarget
  })
  _renderer.setRenderTarget(renderTarget)

  const sdrTexture = new Texture(sdr, UVMapping, ClampToEdgeWrapping, ClampToEdgeWrapping, LinearFilter, LinearFilter, RGBAFormat, UnsignedByteType, 1, SRGBColorSpace)
  sdrTexture.needsUpdate = true
  const gainMapTexture = new Texture(gainMap, UVMapping, ClampToEdgeWrapping, ClampToEdgeWrapping, LinearFilter, LinearFilter, RGBAFormat, UnsignedByteType, 1, NoColorSpace)
  gainMapTexture.needsUpdate = true

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      sdr: { value: sdrTexture },
      gainMap: { value: gainMapTexture },
      mapGamma: { value: 1.0 / mapGamma },
      offsetHdr: { value: offsetHdr },
      offsetSdr: { value: offsetSdr },
      gainMapMin: { value: new Vector3(gainMapMin[0], gainMapMin[1], gainMapMin[2]) },
      gainMapMax: { value: new Vector3(gainMapMax[0], gainMapMax[1], gainMapMax[2]) },
      weightFactor: {
        value: new Vector3(
          (Math.log2(maxDisplayBoost[0]) - hdrCapacityMin[0]) / (hdrCapacityMax[0] - hdrCapacityMin[0]),
          (Math.log2(maxDisplayBoost[1]) - hdrCapacityMin[1]) / (hdrCapacityMax[1] - hdrCapacityMin[1]),
          (Math.log2(maxDisplayBoost[2]) - hdrCapacityMin[2]) / (hdrCapacityMax[2] - hdrCapacityMin[2])
        )
      }
    },
    blending: NoBlending,
    depthTest: false,
    depthWrite: false
  })

  // material = new MeshBasicMaterial({ map: gainMapTexture })

  const plane = new Mesh(new PlaneGeometry(), material)
  plane.geometry.computeBoundingBox()
  scene.add(plane)

  try {
    _renderer.render(scene, orthographicCamera)
  } catch (e) {
    renderError = `${e}`
  }
  scene.remove(plane)

  if (renderError) {
    cleanup({ renderer: _renderer, renderTarget, destroyRenderer, material })
    throw new Error('An error occurred while rendering gainmap: ' + renderError)
  }

  if (decodeAsRenderTarget) {
    cleanup({ renderer: _renderer, destroyRenderer, material })
    return renderTarget as T extends DecodeParameters ? Uint16Array : WebGLRenderTarget
  }
  const out = new Uint16Array(renderTarget.width * renderTarget.height * 4)
  _renderer.readRenderTargetPixels(renderTarget, 0, 0, renderTarget.width, renderTarget.height, out)
  cleanup({ renderer: _renderer, renderTarget, destroyRenderer, material })
  return out as T extends DecodeParameters ? Uint16Array : WebGLRenderTarget
}
