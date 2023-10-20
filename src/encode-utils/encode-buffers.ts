import { Color, DataUtils } from 'three'

import { EncodeBuffersParameters } from '../types'
/**
 *
 * @param params
 * @returns
 */
export const encodeBuffers = ({ sdr, hdr, width, height, maxContentBoost, minContentBoost, mapGamma }: EncodeBuffersParameters) => {
  const originalChannels = sdr.length / width / height

  const sdrColor = new Color()
  const hdrColor = new Color()

  const minMaxContentBoost = 1.0001 // avoid maxContentBoost of 1 (NO HDR) , which could cause problems

  const _maxContentBoost = maxContentBoost !== undefined ? new Color(maxContentBoost, maxContentBoost, maxContentBoost) : new Color(minMaxContentBoost, minMaxContentBoost, minMaxContentBoost)
  const _minContentBoost = minContentBoost !== undefined ? new Color(minContentBoost, minContentBoost, minContentBoost) : new Color(1, 1, 1)
  const _mapGamma = mapGamma !== undefined ? mapGamma : 1

  const offsetSdr = 1 / 64
  const offsetHdr = 1 / 64

  if (maxContentBoost === undefined) {
    // calculate them
    for (let i = 0, l = hdr.length; i < l; i += originalChannels) {
      hdrColor.setRGB(
        DataUtils.fromHalfFloat(hdr[i + 0]),
        DataUtils.fromHalfFloat(hdr[i + 1]),
        DataUtils.fromHalfFloat(hdr[i + 2])
      )

      // hdrColor.convertSRGBToLinear()

      _maxContentBoost.r = Math.max(_maxContentBoost.r, hdrColor.r, minMaxContentBoost)
      _maxContentBoost.g = Math.max(_maxContentBoost.g, hdrColor.g, minMaxContentBoost)
      _maxContentBoost.b = Math.max(_maxContentBoost.b, hdrColor.b, minMaxContentBoost)
      // _minContentBoost = Math.min(_minContentBoost, Math.max(Yhdr, 1))
    }
  }

  const gainMap = new Uint8ClampedArray(width * height * 4)
  let sdrWithGainMapAlphaIndex = 0
  const mapMinLog2 = new Color(Math.log2(_minContentBoost.r), Math.log2(_minContentBoost.g), Math.log2(_minContentBoost.b))
  const mapMaxLog2 = new Color(Math.log2(_maxContentBoost.r), Math.log2(_maxContentBoost.g), Math.log2(_maxContentBoost.b))

  for (let i = 0, l = sdr.length; i < l; i += originalChannels) {
    sdrColor.setRGB(
      sdr[i + 0] / 255,
      sdr[i + 1] / 255,
      sdr[i + 2] / 255
    )
    sdrColor.convertSRGBToLinear()

    hdrColor.setRGB(
      DataUtils.fromHalfFloat(hdr[i + 0]),
      DataUtils.fromHalfFloat(hdr[i + 1]),
      DataUtils.fromHalfFloat(hdr[i + 2])
    )

    // hdrColor.convertSRGBToLinear()

    const pixelGainR = (hdrColor.r + offsetHdr) / (sdrColor.r + offsetSdr)
    const pixelGainG = (hdrColor.g + offsetHdr) / (sdrColor.g + offsetSdr)
    const pixelGainB = (hdrColor.b + offsetHdr) / (sdrColor.b + offsetSdr)

    const logRecoveryR = (Math.log2(pixelGainR) - mapMinLog2.r) / (mapMaxLog2.r - mapMinLog2.r)
    const logRecoveryG = (Math.log2(pixelGainG) - mapMinLog2.g) / (mapMaxLog2.g - mapMinLog2.g)
    const logRecoveryB = (Math.log2(pixelGainB) - mapMinLog2.b) / (mapMaxLog2.b - mapMinLog2.b)

    const clampedRecoveryR = Math.max(0.0, Math.min(1.0, logRecoveryR))
    const clampedRecoveryG = Math.max(0.0, Math.min(1.0, logRecoveryG))
    const clampedRecoveryB = Math.max(0.0, Math.min(1.0, logRecoveryB))

    const recoveryR = Math.pow(clampedRecoveryR, _mapGamma)
    const recoveryG = Math.pow(clampedRecoveryG, _mapGamma)
    const recoveryB = Math.pow(clampedRecoveryB, _mapGamma)

    const encodedRecoveryR = Math.floor(recoveryR * 255.0 + 0.5)
    const encodedRecoveryG = Math.floor(recoveryG * 255.0 + 0.5)
    const encodedRecoveryB = Math.floor(recoveryB * 255.0 + 0.5)

    gainMap[sdrWithGainMapAlphaIndex + 0] = encodedRecoveryR
    gainMap[sdrWithGainMapAlphaIndex + 1] = encodedRecoveryG
    gainMap[sdrWithGainMapAlphaIndex + 2] = encodedRecoveryB
    gainMap[sdrWithGainMapAlphaIndex + 3] = 255

    sdrWithGainMapAlphaIndex += 4
  }
  // console.log('[GainMap] Max Original val', maxVal)

  return {
    gainMap,
    gainMapMin: [mapMinLog2.r, mapMinLog2.g, mapMinLog2.b] as [number, number, number],
    gainMapMax: [mapMaxLog2.r, mapMaxLog2.g, mapMaxLog2.b] as [number, number, number],
    mapGamma: _mapGamma,
    offsetHdr,
    offsetSdr,
    hdrCapacityMin: [Math.max(0, mapMinLog2.r), Math.max(0, mapMinLog2.g), Math.max(0, mapMinLog2.b)] as [number, number, number],
    hdrCapacityMax: [mapMaxLog2.r, mapMaxLog2.g, mapMaxLog2.b] as [number, number, number]
  }
}
