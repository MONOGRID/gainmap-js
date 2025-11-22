/**
 * JPEG marker constants
 * Based on JPEG specification and libultrahdr implementation
 */

/**
 * JPEG marker prefix - all markers start with this byte
 */
export const MARKER_PREFIX = 0xff

/**
 * JPEG markers
 */
export const MARKERS = {
  /** Start of Image */
  SOI: 0xd8,
  /** End of Image */
  EOI: 0xd9,
  /** Application segment 0 */
  APP0: 0xe0,
  /** Application segment 1 (EXIF/XMP) */
  APP1: 0xe1,
  /** Application segment 2 (ICC/MPF) */
  APP2: 0xe2,
  /** Start of Scan */
  SOS: 0xda,
  /** Define Quantization Table */
  DQT: 0xdb,
  /** Define Huffman Table */
  DHT: 0xc4,
  /** Start of Frame (baseline DCT) */
  SOF0: 0xc0
} as const

/**
 * XMP namespace identifier for APP1 marker
 */
export const XMP_NAMESPACE = 'http://ns.adobe.com/xap/1.0/\0'

/**
 * EXIF identifier for APP1 marker
 */
export const EXIF_IDENTIFIER = 'Exif\0\0'

/**
 * MPF signature for APP2 marker
 */
export const MPF_SIGNATURE = 'MPF\0'

/**
 * ICC profile identifier for APP2 marker
 */
export const ICC_IDENTIFIER = 'ICC_PROFILE\0'
