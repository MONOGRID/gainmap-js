/**
 * Minimal JPEG structure walker used to validate encoded files (node side).
 */

export type JpegSegment = {
  /** marker byte (without 0xFF prefix) */
  marker: number
  /** offset of the 0xFF marker prefix */
  offset: number
  /** segment payload (excluding marker and length bytes) */
  payload: Uint8Array
  /** short human readable label, e.g. `APP2:urn:iso:std:iso:ts:21496:-1` */
  label: string
}

const SIGNATURES = ['http://ns.adobe.com/xap/1.0/', 'urn:iso:std:iso:ts:21496:-1', 'MPF', 'Exif', 'ICC_PROFILE', 'JFIF']

const label = (marker: number, payload: Uint8Array) => {
  if (marker === 0xd8) return 'SOI'
  if (marker === 0xda) return 'SOS'
  if (marker >= 0xe0 && marker <= 0xef) {
    const head = Buffer.from(payload.subarray(0, 32)).toString('latin1')
    const signature = SIGNATURES.find(s => head.startsWith(s + '\0'))
    return `APP${marker - 0xe0}${signature ? ':' + signature : ''}`
  }
  return `0x${marker.toString(16)}`
}

/**
 * Walks the marker segments of a single JPEG image starting at `start` (its SOI)
 * up to and including SOS, then skips the entropy-coded data up to EOI.
 *
 * @throws if any marker or segment length is invalid
 * @returns segments and the offset right after EOI
 */
export const walkJpeg = (data: Uint8Array, start = 0) => {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  if (data[start] !== 0xff || data[start + 1] !== 0xd8) throw new Error(`Missing SOI at ${start}`)

  const segments: JpegSegment[] = [{ marker: 0xd8, offset: start, payload: new Uint8Array(0), label: 'SOI' }]
  let pos = start + 2
  for (;;) {
    if (data[pos] !== 0xff) throw new Error(`Invalid marker at ${pos}`)
    const marker = data[pos + 1]
    const length = view.getUint16(pos + 2)
    if (length < 2 || pos + 2 + length > data.length) throw new Error(`Invalid segment length at ${pos}`)
    const payload = data.subarray(pos + 4, pos + 2 + length)
    segments.push({ marker, offset: pos, payload, label: label(marker, payload) })
    pos += 2 + length
    if (marker === 0xda) break
  }

  // entropy-coded data: 0xFF is always followed by 0x00 or a RST marker, except for EOI
  while (pos < data.length - 1 && !(data[pos] === 0xff && data[pos + 1] === 0xd9)) pos++
  if (pos >= data.length - 1) throw new Error('Missing EOI')

  return { segments, end: pos + 2 }
}

/**
 * Walks a JPEG with an appended gain map image
 *
 * @returns the segments of the primary and of the gain map image
 */
export const walkJpegWithGainMap = (data: Uint8Array) => {
  const primary = walkJpeg(data)
  const gainMap = walkJpeg(data, primary.end)
  if (gainMap.end !== data.length) throw new Error(`Trailing ${data.length - gainMap.end} bytes after gain map`)
  return { primary: primary.segments, gainMap: gainMap.segments, gainMapOffset: primary.end }
}
