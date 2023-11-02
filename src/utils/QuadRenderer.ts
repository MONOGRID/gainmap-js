import {
  ByteType,
  ColorSpace,
  FloatType,
  HalfFloatType,
  IntType,
  LinearFilter,
  LinearMipMapLinearFilter,
  Material,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RepeatWrapping,
  RGBAFormat,
  Scene,
  ShortType,
  TextureDataType,
  UnsignedByteType,
  UnsignedIntType,
  WebGLRenderer,
  WebGLRenderTarget
} from 'three'
/**
 * @category General
 * @group General
 */
export type TextureDataTypeToBufferType<TType extends TextureDataType> =
  TType extends typeof UnsignedByteType ? Uint8ClampedArray :
  TType extends typeof HalfFloatType ? Uint16Array :
  TType extends typeof UnsignedIntType ? Uint32Array :
  TType extends typeof ByteType ? Int8Array :
  TType extends typeof ShortType ? Int16Array :
  TType extends typeof IntType ? Int32Array :
  TType extends typeof FloatType ? Float32Array :
  never

/**
 * Utility structure used for rendering a texture with a material
 *
 * @category General
 * @group General
 */
export class QuadRenderer<TType extends TextureDataType, TMaterial extends Material> {
  private _renderer: WebGLRenderer
  private _rendererIsDisposable: boolean = false
  private _material: TMaterial
  private _scene: Scene
  private _camera: OrthographicCamera
  private _quad: Mesh<PlaneGeometry>
  private _renderTarget: WebGLRenderTarget
  private _width: string
  private _height: number
  private _type: TType
  /**
   *
   * @param sourceTexture
   * @param renderer
   */
  constructor (width: number, height: number, type: TType, colorSpace: ColorSpace, material: TMaterial, renderer?:WebGLRenderer) {
    this._width = width
    this._height = height
    this._type = type
    this._material = material
    if (renderer) {
      this._renderer = renderer
    } else {
      this._renderer = QuadRenderer.instantiateRenderer()
      this._rendererIsDisposable = true
    }
    this._scene = new Scene()
    this._camera = new OrthographicCamera()
    this._camera.position.set(0, 0, 10)
    this._camera.left = -0.5
    this._camera.right = 0.5
    this._camera.top = 0.5
    this._camera.bottom = -0.5
    this._camera.updateProjectionMatrix()

    this._quad = new Mesh(new PlaneGeometry(), this._material)

    this._quad.geometry.computeBoundingBox()
    this._scene.add(this._quad)

    this._renderTarget = new WebGLRenderTarget(width, height, {
      type,
      colorSpace,
      format: RGBAFormat,
      magFilter: LinearFilter,
      minFilter: LinearMipMapLinearFilter,
      wrapS: RepeatWrapping,
      wrapT: RepeatWrapping,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: true
    })
  }

  /**
   * Instantiates a temporary renderer
   *
   * @returns
   */
  public static instantiateRenderer () {
    const renderer = new WebGLRenderer()
    renderer.setSize(128, 128)
    // renderer.outputColorSpace = SRGBColorSpace
    // renderer.toneMapping = LinearToneMapping
    // renderer.debug.checkShaderErrors = false
    // this._rendererIsDisposable = true
    return renderer
  }

  /**
   * Renders the input texture using the specified material
   *
   * @param from
   * @param from
   */
  public render = () => {
    this._renderer.setRenderTarget(this._renderTarget)
    try {
      this._renderer.render(this._scene, this._camera)
    } catch (e) {
      this._renderer.setRenderTarget(null)
      throw e
    }
    this._renderer.setRenderTarget(null)
  }

  /**
   * Obtains a Buffer containing the rendered texture.
   *
   * @returns
   */
  public toArray (): TextureDataTypeToBufferType<TType> {
    let out: ArrayBufferLike
    switch (this._type) {
      case UnsignedByteType:
        out = new Uint8ClampedArray(this._width * this._height * 4)
        break
      case HalfFloatType:
        out = new Uint16Array(this._width * this._height * 4)
        break
      case UnsignedIntType:
        out = new Uint32Array(this._width * this._height * 4)
        break
      case ByteType:
        out = new Int8Array(this._width * this._height * 4)
        break
      case ShortType:
        out = new Int16Array(this._width * this._height * 4)
        break
      case IntType:
        out = new Int32Array(this._width * this._height * 4)
        break
      case FloatType:
        out = new Float32Array(this._width * this._height * 4)
        break
      default:
        throw new Error('Unsupported data type')
    }
    this._renderer.readRenderTargetPixels(this._renderTarget, 0, 0, this._width, this._height, out)
    return out as TextureDataTypeToBufferType<TType>
  }

  /**
   * If using a disposable renderer, it will dispose it.
   */
  public dispose () {
    this._renderer.setRenderTarget(null)
    if (this._rendererIsDisposable) {
      this._renderer.dispose()
      this._renderer.forceContextLoss()
    }
  }

  /**
   * Width of the texture
   */
  public get width () { return this._width }
  public set width (value: number) {
    this._width = value
    this._renderTarget.setSize(this._width, this._height)
  }

  /**
   * Height of the texture
   */
  public get height () { return this._height }
  public set height (value: number) {
    this._height = value
    this._renderTarget.setSize(this._width, this._height)
  }

  /**
   * The renderer used
   */
  public get renderer () { return this._renderer }

  /**
   * The `WebGLRenderTarget` used.
   */
  public get renderTarget () { return this._renderTarget }
  public set renderTarget (value: WebGLRenderTarget) {
    this._renderTarget = value
    this._width = value.width
    this._height = value.height
    // this._type = value.texture.type
  }

  /**
   * The `Material` used.
   */
  public get material () { return this._material }
  // public set material (value: TMaterial) { this._material = value }

  // public get rendererIsDisposable () { return this._rendererIsDisposable }
  // public set rendererIsDisposable (value: boolean) { this._rendererIsDisposable = value }
}
