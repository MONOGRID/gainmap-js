import { extractXMP } from './utils/extract-metadata-from-jpeg'
import { MPFExtractor } from './utils/MPFExtractor'
/**
 *
 * @param jpegFile
 * @returns
 */
export const extractGainmapFromJPEG = async (jpegFile: Uint8Array) => {
  const metadata = extractXMP(jpegFile)
  if (!metadata) throw new Error('Gain map XMP metadata not found')

  const mpfExtractor = new MPFExtractor({ extractFII: true, extractNonFII: true })
  const images = await mpfExtractor.extract(jpegFile)
  if (images.length !== 2) throw new Error('Gain map recovery image not found')

  return {
    sdr: new Uint8Array(await images[0].arrayBuffer()),
    gainMap: new Uint8Array(await images[1].arrayBuffer()),
    metadata
  }
}
