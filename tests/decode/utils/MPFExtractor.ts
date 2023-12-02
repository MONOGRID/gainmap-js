import * as decode from '@monogrid/gainmap-js'

/**
 *
 * @param testFile
 * @returns
 */
export const testMPFExtractorInBrowser = async (testFile: string | number[]) => {
  let jpeg
  if (typeof testFile === 'string') {
    const file = await fetch(testFile)
    const fileBuffer = await file.arrayBuffer()
    jpeg = new Uint8Array(fileBuffer)
  } else {
    jpeg = Uint8Array.from(testFile)
  }

  const extractor = new decode.MPFExtractor({ extractFII: true, extractNonFII: true })
  const result = await extractor.extract(jpeg)
  const buffers = await Promise.all(result.map(blob => blob.arrayBuffer()))
  console.log(buffers)
  return buffers.map(buff => Array.from(new Uint8Array(buff)))
}
