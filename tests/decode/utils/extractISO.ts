import * as decode from '@monogrid/gainmap-js'

/**
 * evaluated inside browser
 *
 * @param bytes a JPEG file
 * @returns ISO, XMP and preferred metadata, plus extracted image sizes
 */
export const extractMetadataInBrowser = async (bytes: number[]) => {
  const jpeg = Uint8Array.from(bytes)
  const iso = decode.extractISO(jpeg)
  const xmp = decode.extractXMP(jpeg)
  let extracted
  try {
    const result = await decode.extractGainmapFromJPEG(jpeg)
    extracted = {
      metadata: result.metadata,
      gainMapStartsWithSOI: result.gainMap[0] === 0xff && result.gainMap[1] === 0xd8,
      gainMapEndsWithEOI: result.gainMap[result.gainMap.length - 2] === 0xff && result.gainMap[result.gainMap.length - 1] === 0xd9
    }
  } catch (e) {
    // no metadata
  }
  return { iso, xmp, extracted }
}

/**
 * evaluated inside browser
 *
 * @param file url of a JPEG file
 * @returns ISO metadata
 */
export const extractISOFromFileInBrowser = async (file: string) => {
  const response = await fetch(file)
  return decode.extractISO(new Uint8Array(await response.arrayBuffer()))
}
