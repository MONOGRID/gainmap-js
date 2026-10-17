import { GainMapNotFoundError } from './errors/GainMapNotFoundError'
import { XMPMetadataNotFoundError } from './errors/XMPMetadataNotFoundError'
import { extractISO } from './utils/extractISO'
import { extractXMP } from './utils/extractXMP'
import { MPFExtractor } from './utils/MPFExtractor'
/**
 * Extracts gain map metadata and the gain map recovery image
 * from a single JPEG file.
 *
 * ISO 21496-1 metadata is preferred when present, XMP (Ultra HDR / Adobe hdrgm) is used as fallback.
 *
 * @category Decoding Functions
 * @group Decoding Functions
 * @param jpegFile an `Uint8Array` containing and encoded JPEG file
 * @returns an sdr `Uint8Array` compressed in JPEG, a gainMap `Uint8Array` compressed in JPEG and the parsed metadata
 * @throws Error if neither ISO 21496-1 nor XMP Metadata is found
 * @throws Error if Gain map image is not found
 * @example
 * import { FileLoader } from 'three'
 * import { extractGainmapFromJPEG } from '@monogrid/gainmap-js'
 *
 * const jpegFile = await new FileLoader()
 *  .setResponseType('arraybuffer')
 *  .loadAsync('image.jpg')
 *
 * const { sdr, gainMap, metadata } = extractGainmapFromJPEG(jpegFile)
 */
export const extractGainmapFromJPEG = async (jpegFile: Uint8Array<ArrayBuffer>) => {
  const metadata = extractISO(jpegFile) ?? extractXMP(jpegFile)
  if (!metadata) throw new XMPMetadataNotFoundError('Gain map XMP metadata not found')

  const mpfExtractor = new MPFExtractor({ extractFII: true, extractNonFII: true })
  const images = await mpfExtractor.extract(jpegFile)
  if (images.length !== 2) throw new GainMapNotFoundError('Gain map recovery image not found')

  return {
    sdr: new Uint8Array(await images[0].arrayBuffer()),
    gainMap: new Uint8Array(await images[1].arrayBuffer()),
    metadata
  }
}
