/**
 * ISO 21496-1 binary gain map metadata (de)serialization
 * Based on libultrahdr gainmapmetadata.cpp implementation
 *
 * Layout (big endian):
 * - u16 minimum_version, u16 writer_version
 * - u8 flags (bit 7: multichannel, bit 6: use base colour space, bit 2: backward direction, bit 3: common denominator)
 * - headroom: base_hdr_headroom, alternate_hdr_headroom (unsigned fractions)
 * - per channel: gain_map_min (s), gain_map_max (s), gamma (u), base_offset (s), alternate_offset (s)
 *
 * Fractions are written as numerator + denominator, or numerator only when the common denominator flag is set.
 */

import { type GainMapMetadata } from './types'

/**
 * Namespace identifying an ISO 21496-1 APP2 segment (null terminated)
 */
export const ISO_NAMESPACE = 'urn:iso:std:iso:ts:21496:-1\0'

const IS_MULTICHANNEL_MASK = 1 << 7
const USE_BASE_COLOR_SPACE_MASK = 1 << 6
const USE_COMMON_DENOMINATOR_MASK = 1 << 3
const BACKWARD_DIRECTION_MASK = 1 << 2

const INT32_MAX = 0x7fffffff
const UINT32_MAX = 0xffffffff

/**
 * Converts a float into a fraction, using the largest denominator that keeps the numerator in range
 */
const toFraction = (value: number, signed: boolean): [number, number] => {
  const max = signed ? INT32_MAX : UINT32_MAX
  if (!Number.isFinite(value) || (!signed && value < 0) || Math.abs(value) > max) {
    throw new Error(`Cannot represent ${value} as an ${signed ? 'signed' : 'unsigned'} ISO 21496-1 fraction`)
  }
  const denominator = Math.min(UINT32_MAX, Math.floor(max / Math.max(1, Math.abs(value))))
  return [Math.round(value * denominator), denominator]
}

/**
 * The version-only payload stored in the primary image (minimum_version = 0, writer_version = 0)
 */
export const ISO_VERSION_ONLY = new Uint8Array(4)

/**
 * Serializes gain map metadata into an ISO 21496-1 binary payload
 * (without namespace), to be stored in the gain map image.
 *
 * Values are already in the expected space: gainMapMin/Max and hdrCapacityMin/Max
 * are log2, gamma and offsets are linear.
 *
 * @param metadata
 * @returns
 */
export const encodeISOGainMapMetadata = (metadata: GainMapMetadata) => {
  const channels = [0, 1, 2].map(i => [metadata.gainMapMin[i], metadata.gainMapMax[i], metadata.gamma[i], metadata.offsetSdr[i], metadata.offsetHdr[i]])
  const isMultiChannel = channels.some(c => c.some((v, j) => v !== channels[0][j]))
  const channelCount = isMultiChannel ? 3 : 1

  const data = new Uint8Array(5 + 16 + 40 * channelCount)
  const view = new DataView(data.buffer)
  let pos = 4 // minimum_version and writer_version are 0
  // the gain map is computed in the base image colour space
  view.setUint8(pos++, (isMultiChannel ? IS_MULTICHANNEL_MASK : 0) | USE_BASE_COLOR_SPACE_MASK)

  const writeFraction = (value: number, signed: boolean) => {
    const [n, d] = toFraction(value, signed)
    if (signed) view.setInt32(pos, n)
    else view.setUint32(pos, n)
    view.setUint32(pos + 4, d)
    pos += 8
  }

  writeFraction(metadata.hdrCapacityMin, false)
  writeFraction(metadata.hdrCapacityMax, false)
  for (let i = 0; i < channelCount; i++) {
    const [min, max, gamma, offsetSdr, offsetHdr] = channels[i]
    writeFraction(min, true)
    writeFraction(max, true)
    writeFraction(gamma, false)
    writeFraction(offsetSdr, true)
    writeFraction(offsetHdr, true)
  }
  return data
}

/**
 * Parses an ISO 21496-1 binary payload (without namespace)
 *
 * @param data
 * @returns the parsed metadata
 * @throws {Error} if the payload is unsupported (version, backward direction) or malformed
 */
export const decodeISOGainMapMetadata = (data: Uint8Array): GainMapMetadata => {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  let pos = 0
  const readU16 = () => { const v = view.getUint16(pos); pos += 2; return v }
  const readU32 = () => { const v = view.getUint32(pos); pos += 4; return v }
  const readS32 = () => { const v = view.getInt32(pos); pos += 4; return v }

  const minimumVersion = readU16()
  if (minimumVersion !== 0) throw new Error(`Unsupported ISO 21496-1 minimum_version ${minimumVersion}`)
  readU16() // writer_version
  const flags = view.getUint8(pos++)
  if (flags & BACKWARD_DIRECTION_MASK) throw new Error('ISO 21496-1 metadata with HDR base image is not supported')

  const channelCount = flags & IS_MULTICHANNEL_MASK ? 3 : 1
  const commonDenominator = flags & USE_COMMON_DENOMINATOR_MASK ? readU32() : undefined

  const readFraction = (signed: boolean) => {
    const n = signed ? readS32() : readU32()
    const d = commonDenominator ?? readU32()
    if (d === 0) throw new Error('Invalid ISO 21496-1 fraction with zero denominator')
    return n / d
  }

  const hdrCapacityMin = readFraction(false)
  const hdrCapacityMax = readFraction(false)
  // base headroom greater than alternate headroom means the base image is the HDR rendition
  if (hdrCapacityMin > hdrCapacityMax) throw new Error('ISO 21496-1 metadata with HDR base image is not supported')

  const gainMapMin: number[] = []
  const gainMapMax: number[] = []
  const gamma: number[] = []
  const offsetSdr: number[] = []
  const offsetHdr: number[] = []
  for (let i = 0; i < channelCount; i++) {
    gainMapMin.push(readFraction(true))
    gainMapMax.push(readFraction(true))
    gamma.push(readFraction(false))
    offsetSdr.push(readFraction(true))
    offsetHdr.push(readFraction(true))
  }
  const toRGB = (v: number[]) => (channelCount === 3 ? v : [v[0], v[0], v[0]]) as [number, number, number]

  return {
    gainMapMin: toRGB(gainMapMin),
    gainMapMax: toRGB(gainMapMax),
    gamma: toRGB(gamma),
    offsetSdr: toRGB(offsetSdr),
    offsetHdr: toRGB(offsetHdr),
    hdrCapacityMin,
    hdrCapacityMax
  }
}
