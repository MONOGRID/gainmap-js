import { MainModule } from '../libultrahdr-wasm/build/libultrahdr'
// @ts-expect-error untyped
import libultrahdr from '../libultrahdr-wasm/build/libultrahdr-esm'
import { EncodeRawResult, GainMapMetadata } from './types'

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
    encodingResult.gamma.reduce((p, n) => p + n, 0) / encodingResult.gamma.length,
    encodingResult.offsetSdr.reduce((p, n) => p + n, 0) / encodingResult.offsetSdr.length,
    encodingResult.offsetHdr.reduce((p, n) => p + n, 0) / encodingResult.offsetHdr.length,
    encodingResult.hdrCapacityMin,
    encodingResult.hdrCapacityMax
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
    parsedMetadata
  }
}
