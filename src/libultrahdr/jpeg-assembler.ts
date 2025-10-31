/**
 * JPEG assembler for creating JPEG-R (JPEG with gain map) files
 * Based on libultrahdr jpegr.cpp implementation
 */

import { GainMapMetadataExtended } from '../core/types'
import { type CompressedImage } from '../encode/types'
import { MARKER_PREFIX, MARKERS, XMP_NAMESPACE } from './jpeg-markers'
import { calculateMpfSize, generateMpf } from './mpf-generator'
import { generateXmpForPrimaryImage, generateXmpForSecondaryImage } from './xmp-generator'

/**
 * Options for assembling a JPEG with gain map
 */
export interface AssembleJpegOptions {
  /** Primary (SDR) JPEG image */
  sdr: CompressedImage
  /** Gain map JPEG image */
  gainMap: CompressedImage
  /** Gain map metadata */
  metadata: GainMapMetadataExtended
  /** Optional EXIF data to embed */
  exif?: Uint8Array
  /** Optional ICC color profile */
  icc?: Uint8Array
}

/**
 * Extract EXIF data from a JPEG if present
 *
 * @param jpegData - JPEG file data
 * @returns Object containing EXIF data and position, or null if not found
 */
function extractExif (jpegData: Uint8Array): { data: Uint8Array, pos: number, size: number } | null {
  const view = new DataView(jpegData.buffer, jpegData.byteOffset, jpegData.byteLength)

  // Check for JPEG SOI marker
  if (view.getUint8(0) !== MARKER_PREFIX || view.getUint8(1) !== MARKERS.SOI) {
    return null
  }

  let offset = 2
  const EXIF_SIGNATURE = 'Exif\0\0'

  while (offset < jpegData.length - 1) {
    // Check for marker prefix
    if (view.getUint8(offset) !== MARKER_PREFIX) {
      break
    }

    const marker = view.getUint8(offset + 1)

    // Check for SOS (Start of Scan) - end of metadata
    if (marker === MARKERS.SOS) {
      break
    }

    // Check for APP1 marker (EXIF/XMP)
    if (marker === MARKERS.APP1) {
      const length = view.getUint16(offset + 2, false) // Big endian
      const dataStart = offset + 4

      // Check if this APP1 contains EXIF
      let isExif = true
      for (let i = 0; i < EXIF_SIGNATURE.length; i++) {
        if (dataStart + i >= jpegData.length || jpegData[dataStart + i] !== EXIF_SIGNATURE.charCodeAt(i)) {
          isExif = false
          break
        }
      }

      if (isExif) {
        // Found EXIF data
        const exifSize = length - 2 // Length includes the 2-byte length field itself
        const exifData = jpegData.slice(dataStart, dataStart + exifSize)
        return {
          data: exifData,
          pos: offset,
          size: length + 2 // Include marker (2 bytes) + length (2 bytes) + data
        }
      }
    }

    // Move to next marker
    const length = view.getUint16(offset + 2, false)
    offset += 2 + length
  }

  return null
}

/**
 * Copy JPEG data without EXIF segment
 *
 * @param jpegData - Original JPEG data
 * @param exifPos - Position of EXIF segment
 * @param exifSize - Size of EXIF segment (including marker and length)
 * @returns JPEG data without EXIF
 */
function copyJpegWithoutExif (jpegData: Uint8Array, exifPos: number, exifSize: number): Uint8Array {
  const newSize = jpegData.length - exifSize
  const result = new Uint8Array(newSize)

  // Copy data before EXIF
  result.set(jpegData.subarray(0, exifPos), 0)

  // Copy data after EXIF
  result.set(jpegData.subarray(exifPos + exifSize), exifPos)

  return result
}

/**
 * Write a JPEG marker and its data
 *
 * @param buffer - Target buffer
 * @param pos - Current position in buffer
 * @param marker - Marker type (without 0xFF prefix)
 * @param data - Data to write after marker
 * @returns New position after writing
 */
function writeMarker (buffer: Uint8Array, pos: number, marker: number, data?: Uint8Array): number {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  // Write marker
  view.setUint8(pos++, MARKER_PREFIX)
  view.setUint8(pos++, marker)

  // Write data if present
  if (data && data.length > 0) {
    // Write length (big endian, includes the 2-byte length field itself)
    const length = data.length + 2
    view.setUint16(pos, length, false)
    pos += 2

    // Write data
    buffer.set(data, pos)
    pos += data.length
  }

  return pos
}

/**
 * Assemble a JPEG-R file (JPEG with embedded gain map)
 *
 * The structure is:
 * 1. Primary image:
 *    - SOI
 *    - APP1 (EXIF if present)
 *    - APP1 (XMP with gain map metadata)
 *    - APP2 (ICC profile if present)
 *    - APP2 (MPF data)
 *    - Rest of primary JPEG data
 * 2. Secondary image (gain map):
 *    - SOI
 *    - APP1 (XMP with gain map parameters)
 *    - Rest of gain map JPEG data
 *
 * @param options - Assembly options
 * @returns Complete JPEG-R file as Uint8Array
 */
export function assembleJpegWithGainMap (options: AssembleJpegOptions): Uint8Array<ArrayBuffer> {
  const { sdr, gainMap, metadata, exif: externalExif, icc } = options

  // Validate input
  if (sdr.mimeType !== 'image/jpeg') {
    throw new Error('SDR image must be JPEG format')
  }
  if (gainMap.mimeType !== 'image/jpeg') {
    throw new Error('Gain map image must be JPEG format')
  }

  // Check for EXIF in primary image
  const exifFromJpeg = extractExif(sdr.data)

  if (exifFromJpeg && externalExif) {
    throw new Error('Primary image already contains EXIF data, cannot add external EXIF')
  }

  // Prepare primary JPEG (remove embedded EXIF if present)
  let primaryJpegData = sdr.data
  let exifData = externalExif

  if (exifFromJpeg) {
    primaryJpegData = copyJpegWithoutExif(sdr.data, exifFromJpeg.pos, exifFromJpeg.size)
    exifData = exifFromJpeg.data
  }

  // Generate XMP for secondary image
  const xmpSecondary = generateXmpForSecondaryImage(metadata)
  const xmpSecondaryBytes = new TextEncoder().encode(xmpSecondary)

  // Calculate secondary image size
  // 2 bytes SOI + 2 bytes marker + 2 bytes length field + namespace + XMP data + gain map data (without SOI)
  const namespaceBytes = new TextEncoder().encode(XMP_NAMESPACE)
  const secondaryImageSize = 2 + 2 + 2 + namespaceBytes.length + xmpSecondaryBytes.length + (gainMap.data.length - 2)

  // Generate XMP for primary image
  const xmpPrimary = generateXmpForPrimaryImage(secondaryImageSize, metadata)
  const xmpPrimaryBytes = new TextEncoder().encode(xmpPrimary)
  const xmpPrimaryData = new Uint8Array(namespaceBytes.length + xmpPrimaryBytes.length)
  xmpPrimaryData.set(namespaceBytes, 0)
  xmpPrimaryData.set(xmpPrimaryBytes, namespaceBytes.length)

  // Calculate MPF size and offset
  const mpfLength = calculateMpfSize()

  // Calculate total size
  let totalSize = 2 // SOI
  if (exifData) totalSize += 2 + 2 + exifData.length // APP1 + length + EXIF
  totalSize += 2 + 2 + xmpPrimaryData.length // APP1 + length + XMP primary
  if (icc) totalSize += 2 + 2 + icc.length // APP2 + length + ICC
  totalSize += 2 + 2 + mpfLength // APP2 + length + MPF
  totalSize += primaryJpegData.length - 2 // Primary JPEG without SOI
  totalSize += secondaryImageSize // Secondary image

  // Calculate offsets for MPF
  const primaryImageSize = totalSize - secondaryImageSize
  // Offset is from MP Endian field (after APP2 marker + length + MPF signature)
  const secondaryImageOffset = primaryImageSize - (
    2 + // SOI
    (exifData ? 2 + 2 + exifData.length : 0) +
    2 + 2 + xmpPrimaryData.length +
    (icc ? 2 + 2 + icc.length : 0) +
    2 + 2 + 4 // APP2 marker + length + MPF signature
  )

  // Generate MPF data
  const mpfDataActual = generateMpf(primaryImageSize, 0, secondaryImageSize, secondaryImageOffset)

  // Allocate output buffer
  const output = new Uint8Array(totalSize)
  let pos = 0

  // === PRIMARY IMAGE ===

  // Write SOI
  pos = writeMarker(output, pos, MARKERS.SOI)

  // Write EXIF if present
  if (exifData) {
    pos = writeMarker(output, pos, MARKERS.APP1, exifData)
  }

  // Write XMP for primary image (already created above)
  pos = writeMarker(output, pos, MARKERS.APP1, xmpPrimaryData)

  // Write ICC profile if present
  if (icc) {
    pos = writeMarker(output, pos, MARKERS.APP2, icc)
  }

  // Write MPF
  pos = writeMarker(output, pos, MARKERS.APP2, mpfDataActual)

  // Write rest of primary JPEG (skip SOI)
  output.set(primaryJpegData.subarray(2), pos)
  pos += primaryJpegData.length - 2

  // === SECONDARY IMAGE (GAIN MAP) ===

  // Write SOI
  pos = writeMarker(output, pos, MARKERS.SOI)

  // Write XMP for secondary image
  const xmpSecondaryData = new Uint8Array(namespaceBytes.length + xmpSecondaryBytes.length)
  xmpSecondaryData.set(namespaceBytes, 0)
  xmpSecondaryData.set(xmpSecondaryBytes, namespaceBytes.length)
  pos = writeMarker(output, pos, MARKERS.APP1, xmpSecondaryData)

  // Write rest of gain map JPEG (skip SOI)
  output.set(gainMap.data.subarray(2), pos)
  pos += gainMap.data.length - 2

  return output
}
