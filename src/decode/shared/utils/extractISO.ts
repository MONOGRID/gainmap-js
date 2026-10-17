import { decodeISOGainMapMetadata, ISO_NAMESPACE } from '../../../core/iso-gainmap-metadata'
import { GainMapMetadata } from '../../../core/types'

const ISO_SIGNATURE = Array.from(ISO_NAMESPACE, c => c.charCodeAt(0))

/**
 * Extracts ISO 21496-1 gain map metadata from a JPEG file
 *
 * Looks for APP2 segments carrying the ISO 21496-1 namespace, skipping
 * the version-only segment stored in the primary image.
 *
 * `0xFF 0xE2` cannot appear inside entropy-coded data, so a byte scan is safe.
 *
 * @category Decoding Functions
 * @group Decoding Functions
 * @param input an `Uint8Array` containing an encoded JPEG file
 * @returns the parsed metadata or `undefined` if no supported ISO 21496-1 metadata is found
 */
export const extractISO = (input: Uint8Array): GainMapMetadata | undefined => {
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
  const payloadStart = 4 + ISO_SIGNATURE.length

  for (let i = 0; i + payloadStart < input.length; i++) {
    if (input[i] !== 0xff || input[i + 1] !== 0xe2) continue
    if (!ISO_SIGNATURE.every((c, j) => input[i + 4 + j] === c)) continue

    // segment length includes the 2 length bytes
    const end = Math.min(input.length, i + 2 + view.getUint16(i + 2))
    // version-only block in the primary image
    if (end - (i + payloadStart) <= 4) continue

    try {
      return decodeISOGainMapMetadata(input.subarray(i + payloadStart, end))
    } catch (e) {
      // unsupported or malformed, let the caller fall back to XMP
      return
    }
  }
}
