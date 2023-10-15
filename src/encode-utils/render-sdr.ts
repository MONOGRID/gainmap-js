import {
  ACESFilmicToneMapping,
  DataTexture,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  SRGBColorSpace,
  ToneMapping,
  UnsignedByteType,
  WebGLRenderer,
  WebGLRenderTarget
} from 'three'

/**
 *
 */
const instantiateRenderer = () => {
  const renderer = new WebGLRenderer()
  renderer.setSize(128, 128)
  renderer.debug.checkShaderErrors = false
  return renderer
}

const cleanup = ({ renderer, renderTarget, destroyRenderer }: { renderer: WebGLRenderer, renderTarget?: WebGLRenderTarget, destroyRenderer: boolean }) => {
  renderer.setRenderTarget(null)
  if (destroyRenderer) {
    renderer.dispose()
    renderer.forceContextLoss()
  }
  renderTarget?.dispose()
}
/**
 *
 * @param tex
 * @param toneMapping
 */
export const renderSDR = (tex: DataTexture, toneMapping: ToneMapping = ACESFilmicToneMapping, renderer?: WebGLRenderer) => {
  let _renderer = renderer
  let destroyRenderer = false
  if (!_renderer) {
    _renderer = instantiateRenderer()
    destroyRenderer = true
  }
  const scene = new Scene()
  const renderedObjectContainer = new Group()
  scene.add(renderedObjectContainer)
  const orthographicCamera = new OrthographicCamera()
  const plane = new Mesh(new PlaneGeometry(), new MeshBasicMaterial())
  plane.geometry.computeBoundingBox()

  const width = tex.image.width
  const height = tex.image.height

  const originalToneMapping = _renderer.toneMapping
  const originalColorSpace = _renderer.outputColorSpace

  _renderer.clear(true, true, true)
  _renderer.toneMapping = toneMapping
  _renderer.outputColorSpace = SRGBColorSpace

  plane.scale.y = 1
  plane.material.map = tex
  plane.material.needsUpdate = true
  plane.material.map.needsUpdate = true

  orthographicCamera.position.set(0, 0, 10)
  orthographicCamera.left = -0.5
  orthographicCamera.right = 0.5
  orthographicCamera.top = 0.5
  orthographicCamera.bottom = -0.5
  orthographicCamera.updateProjectionMatrix()

  renderedObjectContainer.clear()
  renderedObjectContainer.add(plane)

  let renderError: string | undefined

  const renderTarget = new WebGLRenderTarget(width, height, {
    type: UnsignedByteType,
    colorSpace: SRGBColorSpace,
    format: RGBAFormat,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    generateMipmaps: false
  })
  _renderer.setRenderTarget(renderTarget)

  try {
    _renderer.render(scene, orthographicCamera)
  } catch (e) {
    renderError = `${e}`
  }
  renderedObjectContainer.remove(plane)

  _renderer.toneMapping = originalToneMapping
  _renderer.outputColorSpace = originalColorSpace

  if (renderError) {
    cleanup({ renderer: _renderer, renderTarget, destroyRenderer })
    throw new Error('An error occurred while retrieving texture pixels: ' + renderError)
  }

  const out = new Uint8ClampedArray(width * height * 4)
  _renderer.readRenderTargetPixels(renderTarget, 0, 0, width, height, out)
  cleanup({ renderer: _renderer, renderTarget, destroyRenderer })
  return out
}
