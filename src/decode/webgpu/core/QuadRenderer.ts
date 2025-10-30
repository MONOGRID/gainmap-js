import {
  ByteType,
  ClampToEdgeWrapping,
  ColorSpace,
  DataTexture,
  FloatType,
  HalfFloatType,
  IntType,
  LinearFilter,
  LinearSRGBColorSpace,
  Material,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RenderTarget,
  RenderTargetOptions,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  ShortType,
  Texture,
  TextureDataType,
  UnsignedByteType,
  UnsignedInt248Type,
  UnsignedInt5999Type,
  UnsignedInt101111Type,
  UnsignedIntType,
  UnsignedShort4444Type,
  UnsignedShort5551Type,
  UnsignedShortType,
  UVMapping,
  WebGPURenderer
} from 'three/webgpu'

import { QuadRendererTextureOptions } from '../../../core/types'
/**
 * Utility Type that translates `three` texture types to their TypedArray counterparts.
 *
 * @category Utility
 * @group Utility
 */
export type TextureDataTypeToBufferType<TType extends TextureDataType> =
  TType extends typeof UnsignedByteType ? Uint8ClampedArray<ArrayBuffer> :
    TType extends typeof ByteType ? Int8Array<ArrayBuffer> :
      TType extends typeof ShortType ? Int16Array<ArrayBuffer> :
        TType extends typeof UnsignedShortType ? Uint16Array<ArrayBuffer> :
          TType extends typeof IntType ? Int32Array<ArrayBuffer> :
            TType extends typeof UnsignedIntType ? Uint32Array<ArrayBuffer> :
              TType extends typeof FloatType ? Float32Array<ArrayBuffer> :
                TType extends typeof HalfFloatType ? Uint16Array<ArrayBuffer> :
                  TType extends typeof UnsignedShort4444Type ? Uint16Array<ArrayBuffer> :
                    TType extends typeof UnsignedShort5551Type ? Uint16Array<ArrayBuffer> :
                      TType extends typeof UnsignedInt248Type ? Uint32Array<ArrayBuffer> :
                        TType extends typeof UnsignedInt5999Type ? Uint32Array<ArrayBuffer> :
                          TType extends typeof UnsignedInt101111Type ? Uint32Array<ArrayBuffer> :
                            never

export type QuadRendererOptions<TType extends TextureDataType, TMaterial extends Material> = {
  /**
   * Width of the render target
   */
  width: number
  /**
   * height of the renderTarget
   */
  height: number
  /**
   * TextureDataType of the renderTarget
   */
  type: TType
  /**
   * ColorSpace of the renderTarget
   */
  colorSpace: ColorSpace
  /**
   * material to use for rendering
   */
  material: TMaterial
  /**
   * Renderer instance to use
   */
  renderer?: WebGPURenderer
  /**
   * Additional renderTarget options
   */
  renderTargetOptions?: QuadRendererTextureOptions
}

// let _canReadPixelsResult: boolean | undefined
/**
 * Test if this browser implementation can correctly read pixels from the specified
 * Render target type.
 *
 * Runs only once
 *
 * @param type
 * @param renderer
 * @param camera
 * @param renderTargetOptions
 * @returns
 */
// const canReadPixels = async (type: TextureDataType, renderer: WebGPURenderer, camera: OrthographicCamera, renderTargetOptions: RenderTargetOptions) => {
//   if (_canReadPixelsResult !== undefined) return _canReadPixelsResult

//   const testRT = new RenderTarget(1, 1, renderTargetOptions)

//   renderer.setRenderTarget(testRT)
//   const mesh = new Mesh(new PlaneGeometry(), new MeshBasicMaterial({ color: 0xffffff }))
//   await renderer.renderAsync(mesh, camera)
//   renderer.setRenderTarget(null)

//   const out = await renderer.readRenderTargetPixelsAsync(testRT, 0, 0, testRT.width, testRT.height)
//   testRT.dispose()
//   mesh.geometry.dispose()
//   mesh.material.dispose()
//   _canReadPixelsResult = out[0] !== 0
//   return _canReadPixelsResult
// }

/**
 * Utility class used for rendering a texture with a material (WebGPU version)
 *
 * @category Core
 * @group Core
 */
export class QuadRenderer<TType extends TextureDataType, TMaterial extends Material> {
  private _renderer: WebGPURenderer
  private _rendererIsDisposable: boolean = false
  private _material: TMaterial
  private _scene: Scene
  private _camera: OrthographicCamera
  private _quad: Mesh<PlaneGeometry>
  private _renderTarget: RenderTarget
  private _width: number
  private _height: number
  private _type: TType
  private _colorSpace: ColorSpace
  private _supportsReadPixels: boolean = true
  /**
   * Constructs a new QuadRenderer
   *
   * @param options Parameters for this QuadRenderer
   */
  constructor (options: QuadRendererOptions<TType, TMaterial>) {
    this._width = options.width
    this._height = options.height
    this._type = options.type
    this._colorSpace = options.colorSpace

    const rtOptions: RenderTargetOptions = {
      // fixed options
      format: RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
      // user options
      type: this._type, // set in class property
      colorSpace: this._colorSpace, // set in class property
      anisotropy: options.renderTargetOptions?.anisotropy !== undefined ? options.renderTargetOptions?.anisotropy : 1,
      generateMipmaps: options.renderTargetOptions?.generateMipmaps !== undefined ? options.renderTargetOptions?.generateMipmaps : false,
      magFilter: options.renderTargetOptions?.magFilter !== undefined ? options.renderTargetOptions?.magFilter : LinearFilter,
      minFilter: options.renderTargetOptions?.minFilter !== undefined ? options.renderTargetOptions?.minFilter : LinearFilter,
      samples: options.renderTargetOptions?.samples !== undefined ? options.renderTargetOptions?.samples : undefined,
      wrapS: options.renderTargetOptions?.wrapS !== undefined ? options.renderTargetOptions?.wrapS : ClampToEdgeWrapping,
      wrapT: options.renderTargetOptions?.wrapT !== undefined ? options.renderTargetOptions?.wrapT : ClampToEdgeWrapping
    }

    this._material = options.material
    if (options.renderer) {
      this._renderer = options.renderer
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

    // this.checkReadPixelsSupport(rtOptions).catch(e => {
    //   console.error(e)
    // })

    this._quad = new Mesh(new PlaneGeometry(), this._material)

    this._quad.geometry.computeBoundingBox()
    this._scene.add(this._quad)

    this._renderTarget = new RenderTarget(this.width, this.height, rtOptions)
    this._renderTarget.texture.mapping = options.renderTargetOptions?.mapping !== undefined ? options.renderTargetOptions?.mapping : UVMapping
  }

  // private async checkReadPixelsSupport (rtOptions: RenderTargetOptions) {
  //   if (!await canReadPixels(this._type, this._renderer, this._camera, rtOptions)) {
  //     let alternativeType: TextureDataType | undefined
  //     switch (this._type) {
  //       case HalfFloatType:
  //         alternativeType = FloatType
  //         break
  //     }
  //     if (alternativeType !== undefined) {
  //       console.warn(`This browser does not support reading pixels from ${this._type} RenderTargets, switching to ${FloatType}`)
  //       this._type = alternativeType as TType
  //     } else {
  //       this._supportsReadPixels = false
  //       console.warn('This browser dos not support toArray or toDataTexture, calls to those methods will result in an error thrown')
  //     }
  //   }
  // }

  /**
   * Instantiates a temporary renderer
   *
   * @returns
   */
  public static instantiateRenderer () {
    const renderer = new WebGPURenderer()
    renderer.setSize(128, 128)
    return renderer
  }

  /**
   * Renders the input texture using the specified material
   */
  public render = async () => {
    if (!this._renderer.hasInitialized()) {
      await this._renderer.init()
    }
    this._renderer.setRenderTarget(this._renderTarget)
    try {
      await this._renderer.renderAsync(this._scene, this._camera)
    } catch (e) {
      this._renderer.setRenderTarget(null)
      throw e
    }
    this._renderer.setRenderTarget(null)
  }

  /**
   * Obtains a Buffer containing the rendered texture.
   *
   * @throws Error if the browser cannot read pixels from this RenderTarget type.
   * @returns a TypedArray containing RGBA values from this renderer
   */
  public async toArray (): Promise<TextureDataTypeToBufferType<TType>> {
    if (!this._supportsReadPixels) throw new Error('Can\'t read pixels in this browser')
    const out = await this._renderer.readRenderTargetPixelsAsync(this._renderTarget, 0, 0, this._width, this._height)
    return out as TextureDataTypeToBufferType<TType>
  }

  /**
   * Performs a readPixel operation in the renderTarget
   * and returns a DataTexture containing the read data
   *
   * @param options options
   * @returns
   */
  public async toDataTexture (options?: QuadRendererTextureOptions) {
    const returnValue = new DataTexture(
      // fixed values
      await this.toArray(),
      this.width,
      this.height,
      RGBAFormat,
      this._type,
      // user values
      options?.mapping || UVMapping,
      options?.wrapS || ClampToEdgeWrapping,
      options?.wrapT || ClampToEdgeWrapping,
      options?.magFilter || LinearFilter,
      options?.minFilter || LinearFilter,
      options?.anisotropy || 1,
      // fixed value
      LinearSRGBColorSpace
    )
    returnValue.flipY = options?.flipY !== undefined ? options?.flipY : true
    // set this afterwards, we can't set it in constructor
    returnValue.generateMipmaps = options?.generateMipmaps !== undefined ? options?.generateMipmaps : false

    return returnValue
  }

  /**
   * If using a disposable renderer, it will dispose it.
   */
  public disposeOnDemandRenderer () {
    this._renderer.setRenderTarget(null)
    if (this._rendererIsDisposable) {
      this._renderer.dispose()
    }
  }

  /**
   * Will dispose of **all** assets used by this renderer.
   *
   *
   * @param disposeRenderTarget will dispose of the renderTarget which will not be usable later
   * set this to true if you passed the `renderTarget.texture` to a `PMREMGenerator`
   * or are otherwise done with it.
   *
   * @example
   * ```js
   * const loader = new HDRJPGLoader(renderer)
   * const result = await loader.loadAsync('gainmap.jpeg')
   * const mesh = new Mesh(geometry, new MeshBasicMaterial({ map: result.renderTarget.texture }) )
   * // DO NOT dispose the renderTarget here,
   * // it is used directly in the material
   * result.dispose()
   * ```
   *
   * @example
   * ```js
   * const loader = new HDRJPGLoader(renderer)
   * const pmremGenerator = new PMREMGenerator( renderer );
   * const result = await loader.loadAsync('gainmap.jpeg')
   * const envMap = pmremGenerator.fromEquirectangular(result.renderTarget.texture)
   * const mesh = new Mesh(geometry, new MeshStandardMaterial({ envMap }) )
   * // renderTarget can be disposed here
   * // because it was used to generate a PMREM texture
   * result.dispose(true)
   * ```
   */
  public dispose (disposeRenderTarget?: boolean) {
    this.disposeOnDemandRenderer()

    if (disposeRenderTarget) {
      this.renderTarget.dispose()
    }

    // dispose shader material texture uniforms
    if (this.material instanceof ShaderMaterial) {
      Object.values(this.material.uniforms).forEach(v => {
        if (v.value instanceof Texture) v.value.dispose()
      })
    }
    // dispose other material properties
    Object.values(this.material).forEach(value => {
      if (value instanceof Texture) value.dispose()
    })

    this.material.dispose()
    this._quad.geometry.dispose()
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
   * The `RenderTarget` used.
   */
  public get renderTarget () { return this._renderTarget }
  public set renderTarget (value: RenderTarget) {
    this._renderTarget = value
    this._width = value.width
    this._height = value.height
  }

  /**
   * The `Material` used.
   */
  public get material () { return this._material }
  /**
   *
   */
  public get type () { return this._type }
  public get colorSpace () { return this._colorSpace }
}
