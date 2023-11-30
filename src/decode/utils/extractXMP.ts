import { GainMapMetadata } from '../../core/types'

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
 * @param input
 * @returns
 */
export const extractXMP = (input: Uint8Array): GainMapMetadata | undefined => {
  let str: string
  // support node test environment
  if (typeof TextDecoder !== 'undefined') str = new TextDecoder().decode(input)
  else str = input.toString()

  let start = str.indexOf('<x:xmpmeta')
  const parser = new DOMParser()

  while (start !== -1) {
    const end = str.indexOf('x:xmpmeta>', start)
    str.slice(start, end + 10)
    const xmpBlock = str.slice(start, end + 10)
    try {
      const xmlDocument = parser.parseFromString(xmpBlock, 'text/xml')
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

      return {
        gainMapMin: Array.isArray(gainMapMin) ? gainMapMin.map(v => parseFloat(v)) as [number, number, number] : [parseFloat(gainMapMin), parseFloat(gainMapMin), parseFloat(gainMapMin)],
        gainMapMax: Array.isArray(gainMapMax) ? gainMapMax.map(v => parseFloat(v)) as [number, number, number] : [parseFloat(gainMapMax), parseFloat(gainMapMax), parseFloat(gainMapMax)],
        gamma: Array.isArray(gamma) ? gamma.map(v => parseFloat(v)) as [number, number, number] : [parseFloat(gamma), parseFloat(gamma), parseFloat(gamma)],
        offsetSdr: Array.isArray(offsetSDR) ? offsetSDR.map(v => parseFloat(v)) as [number, number, number] : [parseFloat(offsetSDR), parseFloat(offsetSDR), parseFloat(offsetSDR)],
        offsetHdr: Array.isArray(offsetHDR) ? offsetHDR.map(v => parseFloat(v)) as [number, number, number] : [parseFloat(offsetHDR), parseFloat(offsetHDR), parseFloat(offsetHDR)],
        hdrCapacityMin: parseFloat(hdrCapacityMin),
        hdrCapacityMax: parseFloat(hdrCapacityMax)
      }
    } catch (e) {

    }
    start = str.indexOf('<x:xmpmeta', end)
  }
}
