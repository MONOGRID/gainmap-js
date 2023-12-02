import * as decode from '@monogrid/gainmap-js'

export const extractXMPInBrowser = async (testFile: string | number[]) => {
  if (typeof testFile === 'string') {
    const file = await fetch(testFile)
    const fileBuffer = await file.arrayBuffer()
    const jpeg = new Uint8Array(fileBuffer)
    return decode.extractXMP(jpeg)
  }
  return decode.extractXMP(Uint8Array.from(testFile))
}
