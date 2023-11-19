import { decodeJPEGMetadata } from '@monogrid/gainmap-js/libultrahdr'

/**
 *
 * @param {string} url
 * @returns
 */
// @ts-expect-error global
window.decodeJPEGMetadata = async (url) => {
  const response = await fetch(`https://local/${url}`)
  const buf = await response.arrayBuffer()
  const result = await decodeJPEGMetadata(new Uint8Array(buf))

  return {
    ...result,
    // Uint8Arrays can't be transferred outside puppeteer
    // emscripten gives any as value for this :\
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    gainMap: Array.from(result.gainMap),
    // Uint8Arrays can't be transferred outside puppeteer
    // emscripten gives any as value for this :\
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    sdr: Array.from(result.sdr)
  }
}
