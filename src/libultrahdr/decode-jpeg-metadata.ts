import { GainMapMetadata } from '../core/types'
import { getLibrary } from './library'

/**
 * @deprecated
 * @param description
 * @param name
 * @param defaultValue
 * @returns
 */
/* istanbul ignore next */
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
 * @deprecated
 * @example
 * import { decodeJPEGMetadata } from '@monogrid/gainmap-js/libultrahdr'
 *
 * // fetch a JPEG image containing a gainmap as ArrayBuffer
 * const gainmap = new Uint8Array(await (await fetch('gainmap.jpeg')).arrayBuffer())
 *
 * // extract data from the JPEG
 * const { gainMap, sdr, parsedMetadata } = await decodeJPEGMetadata(gainmap)
 *
 * @param file A Jpeg file Uint8Array.
 * @returns The decoded data
 * @throws {Error} if the provided file cannot be parsed or does not contain a valid Gainmap
 */
/* istanbul ignore next */
export const decodeJPEGMetadata = async (file: Uint8Array) => {
  const lib = await getLibrary()
  const result = lib.extractJpegR(file, file.length)
  if (!result.success) throw new Error(`${result.errorMessage}`)

  const parser = new DOMParser()
  const xmlDocument = parser.parseFromString(result.metadata as string, 'text/xml')
  const description = xmlDocument.getElementsByTagName('rdf:Description')[0]

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
