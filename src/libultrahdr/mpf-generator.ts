/**
 * Multi-Picture Format (MPF) generator
 * Based on CIPA DC-007 specification and libultrahdr multipictureformat.cpp
 *
 * MPF is used to embed multiple images in a single JPEG file
 */

/**
 * MPF constants from the specification
 */
const MPF_CONSTANTS = {
  /** MPF signature "MPF\0" */
  SIGNATURE: new Uint8Array([0x4d, 0x50, 0x46, 0x00]),

  /** Big endian marker "MM" */
  BIG_ENDIAN: new Uint8Array([0x4d, 0x4d]),

  /** Little endian marker "II" */
  LITTLE_ENDIAN: new Uint8Array([0x49, 0x49]),

  /** TIFF magic number */
  TIFF_MAGIC: 0x002a,

  /** Number of pictures in MPF */
  NUM_PICTURES: 2,

  /** Number of tags to serialize */
  TAG_COUNT: 3,

  /** Size of each tag in bytes */
  TAG_SIZE: 12,

  /** Size of each MP entry in bytes */
  MP_ENTRY_SIZE: 16
} as const

/**
 * MPF tag identifiers
 */
const MPF_TAGS = {
  /** MPF version tag */
  VERSION: 0xb000,

  /** Number of images tag */
  NUMBER_OF_IMAGES: 0xb001,

  /** MP entry tag */
  MP_ENTRY: 0xb002
} as const

/**
 * MPF tag types
 */
const MPF_TAG_TYPES = {
  /** Undefined type */
  UNDEFINED: 7,

  /** Unsigned long type */
  ULONG: 4
} as const

/**
 * MP entry attributes
 */
const MP_ENTRY_ATTRIBUTES = {
  /** JPEG format */
  FORMAT_JPEG: 0x00000000,

  /** Primary image type */
  TYPE_PRIMARY: 0x20000000
} as const

/**
 * MPF version string
 */
const MPF_VERSION = new Uint8Array([0x30, 0x31, 0x30, 0x30]) // "0100"

/**
 * Calculate the total size of the MPF structure
 */
export function calculateMpfSize (): number {
  return (
    MPF_CONSTANTS.SIGNATURE.length + // Signature "MPF\0"
    2 + // Endianness marker
    2 + // TIFF magic number
    4 + // Index IFD Offset
    2 + // Tag count
    MPF_CONSTANTS.TAG_COUNT * MPF_CONSTANTS.TAG_SIZE + // Tags
    4 + // Attribute IFD offset
    MPF_CONSTANTS.NUM_PICTURES * MPF_CONSTANTS.MP_ENTRY_SIZE // MP Entries
  )
}

/**
 * Generate MPF (Multi-Picture Format) data structure
 *
 * @param primaryImageSize - Size of the primary image in bytes
 * @param primaryImageOffset - Offset of the primary image (typically 0 for FII - First Individual Image)
 * @param secondaryImageSize - Size of the secondary (gain map) image in bytes
 * @param secondaryImageOffset - Offset of the secondary image from the MP Endian field
 * @returns Uint8Array containing the MPF data
 */
export function generateMpf (primaryImageSize: number, primaryImageOffset: number, secondaryImageSize: number, secondaryImageOffset: number) {
  const mpfSize = calculateMpfSize()
  const buffer = new ArrayBuffer(mpfSize)
  const view = new DataView(buffer)
  const uint8View = new Uint8Array(buffer)

  let pos = 0

  // Write MPF signature "MPF\0"
  uint8View.set(MPF_CONSTANTS.SIGNATURE, pos)
  pos += MPF_CONSTANTS.SIGNATURE.length

  // Write endianness marker (big endian "MM")
  // Using big endian to match the C++ implementation's USE_BIG_ENDIAN
  uint8View.set(MPF_CONSTANTS.BIG_ENDIAN, pos)
  const bigEndian = false // DataView uses little endian by default, so we need to flip this
  pos += 2

  // Write TIFF magic number (0x002A)
  view.setUint16(pos, MPF_CONSTANTS.TIFF_MAGIC, bigEndian)
  pos += 2

  // Set the Index IFD offset
  // This offset is from the start of the TIFF header (the endianness marker)
  // After: endianness (2) + magic (2) + this offset field (4) = 8 bytes
  const indexIfdOffset = 8
  view.setUint32(pos, indexIfdOffset, bigEndian)
  pos += 4

  // Write tag count (3 tags: version, number of images, MP entries)
  view.setUint16(pos, MPF_CONSTANTS.TAG_COUNT, bigEndian)
  pos += 2

  // Write version tag
  view.setUint16(pos, MPF_TAGS.VERSION, bigEndian)
  pos += 2
  view.setUint16(pos, MPF_TAG_TYPES.UNDEFINED, bigEndian)
  pos += 2
  view.setUint32(pos, MPF_VERSION.length, bigEndian)
  pos += 4
  uint8View.set(MPF_VERSION, pos)
  pos += 4 // Version is 4 bytes, embedded in the tag

  // Write number of images tag
  view.setUint16(pos, MPF_TAGS.NUMBER_OF_IMAGES, bigEndian)
  pos += 2
  view.setUint16(pos, MPF_TAG_TYPES.ULONG, bigEndian)
  pos += 2
  view.setUint32(pos, 1, bigEndian) // Count = 1
  pos += 4
  view.setUint32(pos, MPF_CONSTANTS.NUM_PICTURES, bigEndian)
  pos += 4

  // Write MP entry tag
  view.setUint16(pos, MPF_TAGS.MP_ENTRY, bigEndian)
  pos += 2
  view.setUint16(pos, MPF_TAG_TYPES.UNDEFINED, bigEndian)
  pos += 2
  view.setUint32(pos, MPF_CONSTANTS.MP_ENTRY_SIZE * MPF_CONSTANTS.NUM_PICTURES, bigEndian)
  pos += 4

  // Calculate MP entry offset
  // The offset is from the start of the MP Endian field (after signature)
  // Current position is at the value field of MP Entry tag
  const mpEntryOffset = pos - MPF_CONSTANTS.SIGNATURE.length + 4 + 4
  view.setUint32(pos, mpEntryOffset, bigEndian)
  pos += 4

  // Write attribute IFD offset (0 = none)
  view.setUint32(pos, 0, bigEndian)
  pos += 4

  // Write MP entries for primary image
  // Attribute format: JPEG (0x00000000) | Type: Primary (0x20000000)
  view.setUint32(pos, MP_ENTRY_ATTRIBUTES.FORMAT_JPEG | MP_ENTRY_ATTRIBUTES.TYPE_PRIMARY, bigEndian)
  pos += 4
  view.setUint32(pos, primaryImageSize, bigEndian)
  pos += 4
  view.setUint32(pos, primaryImageOffset, bigEndian)
  pos += 4
  view.setUint16(pos, 0, bigEndian) // Dependent image 1
  pos += 2
  view.setUint16(pos, 0, bigEndian) // Dependent image 2
  pos += 2

  // Write MP entries for secondary image (gain map)
  // Attribute format: JPEG only (no type flag)
  view.setUint32(pos, MP_ENTRY_ATTRIBUTES.FORMAT_JPEG, bigEndian)
  pos += 4
  view.setUint32(pos, secondaryImageSize, bigEndian)
  pos += 4
  view.setUint32(pos, secondaryImageOffset, bigEndian)
  pos += 4
  view.setUint16(pos, 0, bigEndian) // Dependent image 1
  pos += 2
  view.setUint16(pos, 0, bigEndian) // Dependent image 2
  // pos += 2

  return uint8View
}
