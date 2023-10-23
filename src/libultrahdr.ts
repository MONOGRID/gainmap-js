import { MainModule } from '../libultrahdr-wasm/build/libultrahdr'
// @ts-expect-error untyped
import libultrahdr from '../libultrahdr-wasm/build/libultrahdr-esm'
import { EncodeRawResult } from './types'

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
    encodingResult.mapGamma, encodingResult.offsetSdr, encodingResult.offsetHdr,
    encodingResult.hdrCapacityMin.reduce((p, n) => p + n, 0) / encodingResult.hdrCapacityMin.length,
    encodingResult.hdrCapacityMax.reduce((p, n) => p + n, 0) / encodingResult.hdrCapacityMax.length
  ) as Uint8Array
}
