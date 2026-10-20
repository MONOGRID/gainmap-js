import { vec4 } from 'three/tsl'
import { type DataTextureLoaderTexData, Texture, type WebGPURenderer } from 'three/webgpu'

import { getDataTexture } from '../../core/get-data-texture'
import { type GainMapMetadata } from '../../core/types'
import { GainMapNode } from '../../decode/webgpu/nodes/GainMapNode'
import { type WorkerInterfaceImplementation } from '../../worker-types'
import { compress } from '../compress'
import { type CompressedImage, type CompressOptions, type GainmapEncodingParameters } from '../types'
import { findTextureMinMax } from './find-texture-min-max'
import { GainMapEncoderNode } from './nodes/GainMapEncoderNode'
import { type HDRInput, SDRRenditionNode, type SDRRenditionNodeOptions } from './nodes/SDRRenditionNode'
import { readRenderTargetPixels } from './read-render-target-pixels'

// maxContentBoost must be > 1, a gain map can't encode an empty boost range
const MIN_MAX_CONTENT_BOOST = 1.0001
// lower bound of a fitted minContentBoost, guards against negative HDR values
const MIN_MIN_CONTENT_BOOST = 2 ** -16

/**
 * Options of a {@link GainMapEncoder}
 *
 * @category Encoding Parameters
 * @group Encoding Parameters
 */
export type GainMapEncoderOptions = Partial<GainmapEncodingParameters> & SDRRenditionNodeOptions

/**
 * Raw (uncompressed) result of a {@link GainMapEncoder}
 *
 * @category Encoding Parameters
 * @group Encoding Parameters
 */
export type GainMapEncoderRawResult = {
  /** SDR rendition, rows top to bottom */
  sdr: ImageData
  /** Gain map, rows top to bottom */
  gainMap: ImageData
  metadata: GainMapMetadata
}

/**
 * Compressed result of a {@link GainMapEncoder},
 * can be passed as is to `encodeJPEGMetadata` when compressed as `image/jpeg`
 *
 * @category Encoding Parameters
 * @group Encoding Parameters
 */
export type GainMapEncoderCompressedResult = GainMapMetadata & {
  sdr: CompressedImage
  gainMap: CompressedImage
  rawSDR: Uint8ClampedArray
  rawGainMap: Uint8ClampedArray
}

/**
 * A gain map preview: a {@link GainMapNode} decoding the encoder output, following its metadata
 */
class EncoderPreviewNode extends GainMapNode {
  private _encoder: GainMapEncoder

  constructor (encoder: GainMapEncoder) {
    super()
    this._encoder = encoder
    this.setTextures(encoder.sdr, encoder.gainMap).setMetadata(encoder.metadata)
  }

  protected override _getState () {
    // follow the encoder metadata, except the display boost which belongs to the viewer
    const { gamma, offsetSdr, offsetHdr, gainMapMin, gainMapMax, hdrCapacityMin, hdrCapacityMax } = this._encoder.metadata
    const u = this.uniforms
    u.gamma.value.fromArray(gamma)
    u.offsetSdr.value.fromArray(offsetSdr)
    u.offsetHdr.value.fromArray(offsetHdr)
    u.gainMapMin.value.fromArray(gainMapMin)
    u.gainMapMax.value.fromArray(gainMapMax)
    u.hdrCapacityMin.value = hdrCapacityMin
    u.hdrCapacityMax.value = hdrCapacityMax
    return super._getState()
  }
}

/**
 * Encodes an HDR image into an SDR rendition + a gain map, on the GPU, with TSL nodes.
 *
 * {@link GainMapEncoder.sdr} and {@link GainMapEncoder.gainMap} are live texture nodes:
 * every encoding parameter is a uniform, changing one re-renders the affected nodes once, when they're next used.
 * No renderer is needed until the result is read back with {@link GainMapEncoder.read} or {@link GainMapEncoder.compress}.
 *
 * Read back images are oriented top to bottom (like `ImageData`), no `flipY` is needed when compressing them.
 *
 * @category Encoding Functions
 * @group Encoding Functions
 *
 * @example
 * import { GainMapEncoder } from '@monogrid/gainmap-js/encode/webgpu'
 * import { encodeJPEGMetadata } from '@monogrid/gainmap-js/libultrahdr'
 * import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
 * import { AgXToneMapping, MeshBasicNodeMaterial, WebGPURenderer } from 'three/webgpu'
 *
 * const renderer = new WebGPURenderer()
 * await renderer.init()
 *
 * const image = await new EXRLoader().loadAsync('image.exr')
 * const encoder = new GainMapEncoder(image, { toneMapping: AgXToneMapping })
 * // encode the full HDR range
 * await encoder.fitMaxContentBoost(renderer)
 *
 * // live previews, they follow any parameter change
 * sdrMaterial.colorNode = encoder.sdr
 * gainMapMaterial.colorNode = encoder.gainMap
 * hdrMaterial.colorNode = encoder.createPreviewNode() // decodes the encoded result
 *
 * encoder.sdr.exposure.value = 0.9
 * encoder.gainMap.gamma.value.setScalar(1.1)
 *
 * // compress and embed into a single JPEG file
 * const result = await encoder.compress(renderer, { mimeType: 'image/jpeg', quality: 0.9 })
 * const jpeg = encodeJPEGMetadata(result)
 */
export class GainMapEncoder {
  /**
   * The SDR rendition node
   */
  readonly sdr: SDRRenditionNode
  /**
   * The gain map node
   */
  readonly gainMap: GainMapEncoderNode

  private _ownedTexture: Texture | null

  /**
   * @param image the HDR image: a texture, raw texture data (e.g. from a worker) or a TSL node (which requires `width` and `height`)
   * @param options encoding parameters, all of them can be changed later through the node uniforms
   */
  constructor (image: HDRInput | DataTextureLoaderTexData, options: GainMapEncoderOptions = {}) {
    let input: HDRInput
    if (image instanceof Texture || !('data' in image)) {
      input = image as HDRInput
      this._ownedTexture = null
    } else {
      input = this._ownedTexture = getDataTexture(image)
    }
    this.sdr = new SDRRenditionNode(input, options)
    this.gainMap = new GainMapEncoderNode(this.sdr, options)
  }

  /** Width of the encoded images */
  get width () { return this.sdr.width }
  /** Height of the encoded images */
  get height () { return this.sdr.height }

  /**
   * The gain map metadata matching the current parameters
   */
  get metadata (): GainMapMetadata {
    return this.gainMap.metadata
  }

  /**
   * Finds the max value of the HDR image and uses it as `maxContentBoost`,
   * so the full HDR range is encoded.
   *
   * @param renderer
   * @returns the new `maxContentBoost`
   */
  async fitMaxContentBoost (renderer: WebGPURenderer) {
    const max = Math.max(...await findTextureMinMax(this.sdr.hdr, 'max', renderer, this))
    this.gainMap.maxContentBoost.value = max
    return max
  }

  /**
   * Finds the actual range of the per pixel gain between the HDR image and its current SDR rendition
   * and uses it as `minContentBoost` / `maxContentBoost`, so that the gain map can restore the HDR image exactly.
   *
   * Unlike {@link GainMapEncoder.fitMaxContentBoost} this takes the SDR rendition into account:
   * tone mapping operators like Cineon, AgX or ACES make some pixels of the SDR rendition brighter
   * (or less saturated) than the HDR image, which requires a `minContentBoost` below 1,
   * and they compress highlights more than a plain clamp, which may require a `maxContentBoost` above the HDR max.
   * Exposure, brightness, contrast and saturation have the same effect.
   *
   * Call it again whenever the SDR rendition or the offsets change.
   *
   * @param renderer
   * @returns the new `minContentBoost` and `maxContentBoost`
   */
  async fitContentBoost (renderer: WebGPURenderer) {
    // the gain is computed from the 8 bit SDR rendition, like the gain map itself
    this.sdr.render(renderer)
    const gain = vec4(this.gainMap.pixelGain, 1)
    const size = { width: this.width, height: this.height }
    const gainMin = await findTextureMinMax(gain, 'min', renderer, size)
    const gainMax = await findTextureMinMax(gain, 'max', renderer, size)
    // pixels where HDR and SDR match (gain 1) must stay encodable, so the range always includes 1
    const min = Math.max(MIN_MIN_CONTENT_BOOST, Math.min(1, ...gainMin))
    const max = Math.max(MIN_MAX_CONTENT_BOOST, ...gainMax)
    this.gainMap.minContentBoost.value = min
    this.gainMap.maxContentBoost.value = max
    return { min, max }
  }

  /**
   * Creates a {@link GainMapNode} decoding the encoded result on the fly,
   * it follows any change to the encoding parameters.
   * Its `maxDisplayBoost` is initialized to restore the full HDR range, and is not changed afterwards.
   */
  createPreviewNode (): GainMapNode {
    return new EncoderPreviewNode(this)
  }

  /**
   * Renders the SDR rendition and the gain map, only if something changed since the last render
   *
   * @param renderer
   */
  render (renderer: WebGPURenderer) {
    // renders the SDR rendition first
    this.gainMap.render(renderer)
  }

  /**
   * Renders (if needed) and reads back the raw SDR rendition and gain map
   *
   * @param renderer
   */
  async read (renderer: WebGPURenderer): Promise<GainMapEncoderRawResult> {
    this.render(renderer)
    const metadata = this.metadata
    const [sdr, gainMap] = await Promise.all([
      readRenderTargetPixels(renderer, this.sdr.renderTarget),
      readRenderTargetPixels(renderer, this.gainMap.renderTarget)
    ])
    return {
      sdr: new ImageData(new Uint8ClampedArray(sdr), this.width, this.height),
      gainMap: new ImageData(new Uint8ClampedArray(gainMap), this.width, this.height),
      metadata
    }
  }

  /**
   * Renders (if needed), reads back and compresses the SDR rendition and gain map
   *
   * @param renderer
   * @param options compression options, `flipY` is not needed
   * @throws {Error} if the browser does not support [createImageBitmap](https://caniuse.com/createimagebitmap)
   */
  async compress (renderer: WebGPURenderer, options: CompressOptions & { withWorker?: WorkerInterfaceImplementation }): Promise<GainMapEncoderCompressedResult> {
    const { sdr, gainMap, metadata } = await this.read(renderer)
    const { withWorker, ...compressOptions } = options

    if (withWorker) {
      const [compressedSDR, compressedGainMap] = await Promise.all([
        withWorker.compress({ ...compressOptions, source: sdr }),
        withWorker.compress({ ...compressOptions, source: gainMap })
      ])
      return { ...metadata, sdr: compressedSDR, gainMap: compressedGainMap, rawSDR: compressedSDR.source, rawGainMap: compressedGainMap.source }
    }

    const [compressedSDR, compressedGainMap] = await Promise.all([
      compress({ ...compressOptions, source: sdr }),
      compress({ ...compressOptions, source: gainMap })
    ])
    return { ...metadata, sdr: compressedSDR, gainMap: compressedGainMap, rawSDR: sdr.data, rawGainMap: gainMap.data }
  }

  /**
   * Disposes the nodes, and the HDR texture if it was created by the encoder from raw data
   */
  dispose () {
    this.sdr.dispose()
    this.gainMap.dispose()
    this._ownedTexture?.dispose()
  }
}
