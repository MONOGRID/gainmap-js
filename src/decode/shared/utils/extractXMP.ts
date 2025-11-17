import { GainMapMetadata } from '../../../core/types'

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

export const extractXMP = (input: Uint8Array): GainMapMetadata | undefined => {
  let str: string
  // support node test environment
  if (typeof TextDecoder !== 'undefined') str = new TextDecoder().decode(input)
  else str = input.toString()

  let start = str.indexOf('<x:xmpmeta')

  while (start !== -1) {
    const end = str.indexOf('x:xmpmeta>', start)
    const xmpBlock = str.slice(start, end + 10)

    try {
      const gainMapMin = getXMLValue(xmpBlock, 'hdrgm:GainMapMin', '0')
      const gainMapMax = getXMLValue(xmpBlock, 'hdrgm:GainMapMax')
      const gamma = getXMLValue(xmpBlock, 'hdrgm:Gamma', '1')
      const offsetSDR = getXMLValue(xmpBlock, 'hdrgm:OffsetSDR', '0.015625')
      const offsetHDR = getXMLValue(xmpBlock, 'hdrgm:OffsetHDR', '0.015625')

      // These are always attributes, so we can use a simpler regex
      const hdrCapacityMinMatch = /hdrgm:HDRCapacityMin="([^"]*)"/.exec(xmpBlock)
      const hdrCapacityMin = hdrCapacityMinMatch ? hdrCapacityMinMatch[1] : '0'

      const hdrCapacityMaxMatch = /hdrgm:HDRCapacityMax="([^"]*)"/.exec(xmpBlock)
      if (!hdrCapacityMaxMatch) throw new Error('Incomplete gainmap metadata')
      const hdrCapacityMax = hdrCapacityMaxMatch[1]

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
      // Continue searching for another xmpmeta block if this one fails
    }
    start = str.indexOf('<x:xmpmeta', end)
  }
}
