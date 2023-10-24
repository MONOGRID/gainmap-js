import { MainModule } from '../libultrahdr-wasm/build/libultrahdr'
// @ts-expect-error untyped
import libultrahdr from '../libultrahdr-wasm/build/libultrahdr-esm'
import { EncodeRawResult } from './types'

let library: MainModule | undefined

export type LibultraHDRModule = MainModule
/**
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
 *
 * @param encodingResult
 * @returns
 */
export const encodeJPEGMetadata = async (encodingResult: EncodeRawResult) => {
  const lib = await getLibrary()
  return lib.appendGainMap(
    encodingResult.sdr.width, encodingResult.sdr.height,
    encodingResult.sdr.data, encodingResult.sdr.data.length,
    encodingResult.gainMap.data, encodingResult.gainMap.data.length,
    encodingResult.gainMapMax.reduce((p, n) => p + n, 0) / encodingResult.gainMapMax.length,
    encodingResult.gainMapMin.reduce((p, n) => p + n, 0) / encodingResult.gainMapMin.length,
    encodingResult.mapGamma, encodingResult.offsetSdr, encodingResult.offsetHdr,
    encodingResult.hdrCapacityMin.reduce((p, n) => p + n, 0) / encodingResult.hdrCapacityMin.length,
    encodingResult.hdrCapacityMax.reduce((p, n) => p + n, 0) / encodingResult.hdrCapacityMax.length
  ) as Uint8Array
}

const getAttribute = (description: Element, name: string) => {
  let returnValue: string | string[]
  const parsedValue = description.attributes.getNamedItem(name)?.nodeValue
  if (!parsedValue) {
    const node = description.getElementsByTagName(name)[0]
    if (node) {
      const values = node.getElementsByTagName('rdf:li')
      if (values.length === 3) {
        returnValue = Array.from(values).map(v => v.innerHTML)
      } else {
        throw new Error('Incomplete gainmap metadata')
      }
    } else {
      throw new Error('Incomplete gainmap metadata')
    }
  } else {
    returnValue = parsedValue
  }

  return returnValue
}

/**
 *
 * @param file
 * @returns
 */
export const decodeJPEGMetadata = async (file: Uint8Array) => {
  const lib = await getLibrary()
  const result = lib.extractJpegR(file, file.length)
  if (!result.success) throw new Error(result.errorMessage)

  const parser = new DOMParser()
  const xmldocuemnt = parser.parseFromString(result.metadata as string, 'text/xml')
  const description = xmldocuemnt.getElementsByTagName('rdf:Description')[0]

  const gainmapMin = getAttribute(description, 'hdrgm:GainMapMin')

  const gainmapMax = getAttribute(description, 'hdrgm:GainMapMax')

  const gamma = description.attributes.getNamedItem('hdrgm:Gamma')?.nodeValue
  if (!gamma) throw new Error('Incomplete gainmap metadata')
  const offsetSDR = description.attributes.getNamedItem('hdrgm:OffsetSDR')?.nodeValue
  if (!offsetSDR) throw new Error('Incomplete gainmap metadata')
  const offsetHDR = description.attributes.getNamedItem('hdrgm:OffsetHDR')?.nodeValue
  if (!offsetHDR) throw new Error('Incomplete gainmap metadata')

  const hdrCapacityMin = getAttribute(description, 'hdrgm:HDRCapacityMin')
  const hdrCapacityMax = getAttribute(description, 'hdrgm:HDRCapacityMax')

  return {
    ...result,
    parsedMetadata: {
      gainmapMin: Array.isArray(gainmapMin) ? gainmapMin.map(v => parseFloat(v)) : parseFloat(gainmapMin),
      gainmapMax: Array.isArray(gainmapMax) ? gainmapMax.map(v => parseFloat(v)) : parseFloat(gainmapMax),
      gamma: parseFloat(gamma),
      offsetSDR: parseFloat(offsetSDR),
      offsetHDR: parseFloat(offsetHDR),
      hdrCapacityMin: Array.isArray(hdrCapacityMin) ? hdrCapacityMin.map(v => parseFloat(v)) : parseFloat(hdrCapacityMin),
      hdrCapacityMax: Array.isArray(hdrCapacityMax) ? hdrCapacityMax.map(v => parseFloat(v)) : parseFloat(hdrCapacityMax)
    }
  }
}
