import * as decode from '@monogrid/gainmap-js'
/**
 * test evaluated inside browser
 * @param args
 * @returns
 */
export const extractInBrowser = async (args: { file: string }) => {
  // fetch a JPEG image containing a gainmap as ArrayBuffer
  const file = await fetch(args.file)
  const fileBuffer = await file.arrayBuffer()
  const jpeg = new Uint8Array(fileBuffer)
  return decode.extractGainmapFromJPEG(jpeg)
}
