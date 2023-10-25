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

  const gainMapMin = getAttribute(description, 'hdrgm:GainMapMin', '0')
  const gainMapMax = getAttribute(description, 'hdrgm:GainMapMax')

  let gamma = description.attributes.getNamedItem('hdrgm:Gamma')?.nodeValue
  if (!gamma) gamma = '1'

  let offsetSDR = description.attributes.getNamedItem('hdrgm:OffsetSDR')?.nodeValue
  if (!offsetSDR) offsetSDR = '0.015625'
  let offsetHDR = description.attributes.getNamedItem('hdrgm:OffsetHDR')?.nodeValue
  if (!offsetHDR) offsetHDR = '0.015625'

  const hdrCapacityMin = getAttribute(description, 'hdrgm:HDRCapacityMin', '0')
  const hdrCapacityMax = getAttribute(description, 'hdrgm:HDRCapacityMax')

  return {
    ...result,
    parsedMetadata: {
      gainMapMin: Array.isArray(gainMapMin) ? gainMapMin.map(v => parseFloat(v)) as [number, number, number] : parseFloat(gainMapMin),
      gainMapMax: Array.isArray(gainMapMax) ? gainMapMax.map(v => parseFloat(v)) as [number, number, number] : parseFloat(gainMapMax),
      mapGamma: parseFloat(gamma),
      offsetSDR: parseFloat(offsetSDR),
      offsetHDR: parseFloat(offsetHDR),
      hdrCapacityMin: Array.isArray(hdrCapacityMin) ? hdrCapacityMin.map(v => parseFloat(v)) as [number, number, number] : parseFloat(hdrCapacityMin),
      hdrCapacityMax: Array.isArray(hdrCapacityMax) ? hdrCapacityMax.map(v => parseFloat(v)) as [number, number, number] : parseFloat(hdrCapacityMax)
    }
  }
}
