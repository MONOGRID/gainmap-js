import { MainModule } from '../libultrahdr-wasm/build/libultrahdr'
// @ts-expect-error untyped
import libultrahdr from '../libultrahdr-wasm/build/libultrahdr-esm'
import { CompressedImage, GainMapMetadata } from './types'

export * from '../libultrahdr-wasm/build/libultrahdr'
export * from './loaders/JPEGRLoader'

let library: MainModule | undefined

/**
 * Instances the WASM module and returns it, only one module will be created upon multiple calls.
 * @category General
 * @group General
 *
 * @returns
 */
export const getLibrary = async () => {
  if (!library) {
    library = await libultrahdr() as MainModule
  }
  return library
}

/**
 * Encapsulates a Gainmap into a single JPEG file (aka: JPEG-R) with the base map
 * as the sdr visualization and the gainMap encoded into a MPF (Multi-Picture Format) tag.
 *
 * @category Encoding
 * @group Encoding
 *
 * @example
 * import { compress, encode, findTextureMinMax } from '@monogrid/gainmap-js'
 * import { encodeJPEGMetadata } from '@monogrid/gainmap-js/libultrahdr'
 * import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
 *
 * // load an HDR file
 * const loader = new EXRLoader()
 * const image = await loader.loadAsync('image.exr')
 *
 * // find RAW RGB Max value of a texture
 * const textureMax = await findTextureMinMax(image)
 *
 * // Encode the gainmap
 * const encodingResult = encode({
 *   image,
 *   maxContentBoost: Math.max.apply(this, textureMax)
 * })
 *
 * // obtain the RAW RGBA SDR buffer and create an ImageData
 * const sdrImageData = new ImageData(encodingResult.sdr.toArray(), encodingResult.sdr.width, encodingResult.sdr.height)
 * // obtain the RAW RGBA Gain map buffer and create an ImageData
 * const gainMapImageData = new ImageData(encodingResult.gainMap.toArray(), encodingResult.gainMap.width, encodingResult.gainMap.height)
 *
 * // parallel compress the RAW buffers into the specified mimeType
 * const mimeType = 'image/jpeg'
 * const quality = 0.9
 *
 * const [sdr, gainMap] = await Promise.all([
 *   compress({
 *     source: sdrImageData,
 *     mimeType,
 *     quality,
 *     flipY: true // output needs to be flipped
 *   }),
 *   compress({
 *     source: gainMapImageData,
 *     mimeType,
 *     quality,
 *     flipY: true // output needs to be flipped
 *   })
 * ])
 *
 * // obtain the metadata which will be embedded into
 * // and XMP tag inside the final JPEG file
 * const metadata = encodingResult.getMetadata()
 *
 * // embed the compressed images + metadata into a single
 * // JPEG file
 * const jpeg = await encodeJPEGMetadata({
 *   ...encodingResult,
 *   ...metadata,
 *   sdr,
 *   gainMap
 * })
 *
 * // `jpeg` will be an `Uint8Array` which can be saved somewhere
 *
 *
 * @param encodingResult
 * @returns an Uint8Array representing a JPEG-R file
 * @throws {Error} If `encodingResult.sdr.mimeType !== 'image/jpeg'`
 * @throws {Error} If `encodingResult.gainMap.mimeType !== 'image/jpeg'`
 */
export const encodeJPEGMetadata = async (encodingResult: GainMapMetadata & { sdr: CompressedImage, gainMap: CompressedImage }) => {
  const lib = await getLibrary()

  if (encodingResult.sdr.mimeType !== 'image/jpeg') throw new Error('This function expects an SDR image compressed in jpeg')
  if (encodingResult.gainMap.mimeType !== 'image/jpeg') throw new Error('This function expects a GainMap image compressed in jpeg')

  return lib.appendGainMap(
    encodingResult.sdr.width, encodingResult.sdr.height,
    encodingResult.sdr.data, encodingResult.sdr.data.length,
    encodingResult.gainMap.data, encodingResult.gainMap.data.length,
    encodingResult.gainMapMax.reduce((p, n) => p + n, 0) / encodingResult.gainMapMax.length,
    encodingResult.gainMapMin.reduce((p, n) => p + n, 0) / encodingResult.gainMapMin.length,
    encodingResult.gamma.reduce((p, n) => p + n, 0) / encodingResult.gamma.length,
    encodingResult.offsetSdr.reduce((p, n) => p + n, 0) / encodingResult.offsetSdr.length,
    encodingResult.offsetHdr.reduce((p, n) => p + n, 0) / encodingResult.offsetHdr.length,
    encodingResult.hdrCapacityMin,
    encodingResult.hdrCapacityMax
  ) as Uint8Array
}

/**
 *
 * @param description
 * @param name
 * @param defaultValue
 * @returns
 */
const getAttribute = (description: Element, name: string, defaultValue?: string) => {
  let returnValue: string | [string, string, string]
  const parsedValue = description.attributes.getNamedItem(name)?.nodeValue
  if (!parsedValue) {
    const node = description.getElementsByTagName(name)[0]
    if (node) {
      const values = node.getElementsByTagName('rdf:li')
      if (values.length === 3) {
        returnValue = Array.from(values).map(v => v.innerHTML) as [string, string, string]
      } else {
        throw new Error(`Gainmap metadata contains an array of items for ${name} but its length is not 3`)
      }
    } else {
      if (defaultValue) return defaultValue
      else throw new Error(`Can't find ${name} in gainmap metadata`)
    }
  } else {
    returnValue = parsedValue
  }

  return returnValue
}

/**
 * Decodes a JPEG file with an embedded Gainmap and XMP Metadata (aka JPEG-R)
 *
 * @category Decoding
 * @group Decoding
 *
 * @example
 * import { decode } from '@monogrid/gainmap-js'
 * import { decodeJPEGMetadata } from '@monogrid/gainmap-js/libultrahdr'
 * import { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'
 * // fetch a JPEG image containing a gainmap as ArrayBuffer
 * const gainmap = await (await fetch('gainmap.jpeg')).arrayBuffer()
 *
 * // extract data from the JPEG
 * const { sdr, gainMap, parsedMetadata } = await decodeJPEGMetadata(new Uint8Array(gainmap))
 *
 * // restore the HDR texture
 * const result = await decode({
 *   sdr,
 *   gainMap,
 *   // this will restore the full HDR range
 *   maxDisplayBoost: Math.pow(2, parsedMetadata.hdrCapacityMax),
 *   ...parsedMetadata
 * })
 *
 * // result can be used to populate a Texture
 * const mesh = new Mesh(new PlaneGeometry(), new MeshBasicMaterial({ map: result.renderTarget.texture }))
 *
 *
 * @param file A Jpeg file Uint8Array.
 * @returns The decoded data
 * @throws {Error} if the provided file cannot be parsed or does not contain a valid Gainmap
 */
export const decodeJPEGMetadata = async (file: Uint8Array) => {
  const lib = await getLibrary()
  const result = lib.extractJpegR(file, file.length)
  if (!result.success) throw new Error(result.errorMessage)

  const parser = new DOMParser()
  const xmldocuemnt = parser.parseFromString(result.metadata as string, 'text/xml')
  const description = xmldocuemnt.getElementsByTagName('rdf:Description')[0]

  const gainMapMin = getAttribute(description, 'hdrgm:GainMapMin', '0')
  const gainMapMax = getAttribute(description, 'hdrgm:GainMapMax')

  const gamma = getAttribute(description, 'hdrgm:Gamma', '1')

  const offsetSDR = getAttribute(description, 'hdrgm:OffsetSDR', '0.015625')
  const offsetHDR = getAttribute(description, 'hdrgm:OffsetHDR', '0.015625')

  let hdrCapacityMin = description.attributes.getNamedItem('hdrgm:HDRCapacityMin')?.nodeValue
  if (!hdrCapacityMin) hdrCapacityMin = '0'

  const hdrCapacityMax = description.attributes.getNamedItem('hdrgm:HDRCapacityMax')?.nodeValue
  if (!hdrCapacityMax) throw new Error('Incomplete gainmap metadata')

  const parsedMetadata: GainMapMetadata = {
    gainMapMin: Array.isArray(gainMapMin) ? gainMapMin.map(v => parseFloat(v)) as [number, number, number] : [parseFloat(gainMapMin), parseFloat(gainMapMin), parseFloat(gainMapMin)],
    gainMapMax: Array.isArray(gainMapMax) ? gainMapMax.map(v => parseFloat(v)) as [number, number, number] : [parseFloat(gainMapMax), parseFloat(gainMapMax), parseFloat(gainMapMax)],
    gamma: Array.isArray(gamma) ? gamma.map(v => parseFloat(v)) as [number, number, number] : [parseFloat(gamma), parseFloat(gamma), parseFloat(gamma)],
    offsetSdr: Array.isArray(offsetSDR) ? offsetSDR.map(v => parseFloat(v)) as [number, number, number] : [parseFloat(offsetSDR), parseFloat(offsetSDR), parseFloat(offsetSDR)],
    offsetHdr: Array.isArray(offsetHDR) ? offsetHDR.map(v => parseFloat(v)) as [number, number, number] : [parseFloat(offsetHDR), parseFloat(offsetHDR), parseFloat(offsetHDR)],
    hdrCapacityMin: parseFloat(hdrCapacityMin),
    hdrCapacityMax: parseFloat(hdrCapacityMax)
  }

  return {
    ...result,
    /**
     * Parsed metadata
     */
    parsedMetadata
  }
}
