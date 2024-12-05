import { GainMapMetadata } from '../core/types'
import { getLibrary } from './library'

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

  const getXMLValue = (xml: string, tag: string, defaultValue?: string): string | [string, string, string] => {
    // Check for attribute format first: tag="value"
    const attributeMatch = new RegExp(`${tag}="([^"]*)"`, 'i').exec(xml)
    if (attributeMatch) return attributeMatch[1]

    // Check for tag format: <tag>value</tag> or <tag><rdf:li>value</rdf:li>...</tag>
    const tagMatch = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(xml)
    if (tagMatch) {
      // Check if it contains rdf:li elements
      const liValues = tagMatch[1].match(/<rdf:li>([^<]*)<\/rdf:li>/g)
      if (liValues && liValues.length === 3) {
        return liValues.map(v => v.replace(/<\/?rdf:li>/g, '')) as [string, string, string]
      }
      return tagMatch[1].trim()
    }

    if (defaultValue !== undefined) return defaultValue
    throw new Error(`Can't find ${tag} in gainmap metadata`)
  }

  const metadata = result.metadata as string

  const gainMapMin = getXMLValue(metadata, 'hdrgm:GainMapMin', '0')
  const gainMapMax = getXMLValue(metadata, 'hdrgm:GainMapMax')
  const gamma = getXMLValue(metadata, 'hdrgm:Gamma', '1')
  const offsetSDR = getXMLValue(metadata, 'hdrgm:OffsetSDR', '0.015625')
  const offsetHDR = getXMLValue(metadata, 'hdrgm:OffsetHDR', '0.015625')

  // These are always attributes, so we can use a simpler regex
  const hdrCapacityMinMatch = /hdrgm:HDRCapacityMin="([^"]*)"/.exec(metadata)
  const hdrCapacityMin = hdrCapacityMinMatch ? hdrCapacityMinMatch[1] : '0'

  const hdrCapacityMaxMatch = /hdrgm:HDRCapacityMax="([^"]*)"/.exec(metadata)
  if (!hdrCapacityMaxMatch) throw new Error('Incomplete gainmap metadata')
  const hdrCapacityMax = hdrCapacityMaxMatch[1]

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
    parsedMetadata
  }
}
