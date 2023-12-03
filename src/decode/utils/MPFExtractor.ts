export type MPFExtractorOptions = {
  debug: boolean
  extractFII: boolean
  extractNonFII: boolean
}

type MPFImage = {
  MPType: number
  size: number
  dataOffset: number
  dependantImages: number
  start: number
  isFII: boolean
  end: number
}

/**
 * MPF Extractor (Multi Picture Format Extractor)
 * By Henrik S Nilsson 2019
 *
 * Extracts images stored in images based on the MPF format (found here: https://www.cipa.jp/e/std/std-sec.html
 * under "CIPA DC-007-Translation-2021 Multi-Picture Format"
 *
 * Overly commented, and without intention of being complete or production ready.
 * Created to extract depth maps from iPhone images, and to learn about image metadata.
 * Kudos to: Phil Harvey (exiftool), Jaume Sanchez (android-lens-blur-depth-extractor)
 */
export class MPFExtractor {
  options: MPFExtractorOptions

  constructor (options?: Partial<MPFExtractorOptions>) {
    this.options = {
      debug: options && options.debug !== undefined ? options.debug : false,
      extractFII: options && options.extractFII !== undefined ? options.extractFII : true,
      extractNonFII: options && options.extractNonFII !== undefined ? options.extractNonFII : true
    }
  }

  extract (imageArrayBuffer: Uint8Array) {
    return new Promise<Blob[]>((resolve, reject) => {
      const debug = this.options.debug

      const dataView = new DataView(imageArrayBuffer.buffer)
      // If you're executing this line on a big endian machine, it'll be reversed.
      // bigEnd further down though, refers to the endianness of the image itself.
      if (dataView.getUint16(0) !== 0xffd8) {
        reject(new Error('Not a valid jpeg'))
        return
      }

      const length = dataView.byteLength
      let offset = 2
      let loops = 0
      let marker // APP# marker

      while (offset < length) {
        if (++loops > 250) {
          reject(new Error(`Found no marker after ${loops} loops 😵`))
          return
        }
        if (dataView.getUint8(offset) !== 0xff) {
          reject(new Error(`Not a valid marker at offset 0x${offset.toString(16)}, found: 0x${dataView.getUint8(offset).toString(16)}`))
          return
        }

        marker = dataView.getUint8(offset + 1)
        if (debug) console.log(`Marker: ${marker.toString(16)}`)

        if (marker === 0xe2) {
          if (debug) console.log('Found APP2 marker (0xffe2)')
          // Works for iPhone 8 Plus, X, and XSMax. Or any photos of MPF format.
          // Great way to visualize image information in html is using Exiftool. E.g.:
          // ./exiftool.exe -htmldump -wantTrailer photo.jpg > photo.html

          const formatPt = offset + 4
          /*
           *  Structure of the MP Format Identifier
           *
           *  Offset Addr.  | Code (Hex)  | Description
           *  +00             ff            Marker Prefix      <-- offset
           *  +01             e2            APP2
           *  +02             #n            APP2 Field Length
           *  +03             #n            APP2 Field Length
           *  +04             4d            'M'                <-- formatPt
           *  +05             50            'P'
           *  +06             46            'F'
           *  +07             00            NULL
           *                                                   <-- tiffOffset
           */
          if (dataView.getUint32(formatPt) === 0x4d504600) {
            // Found MPF tag, so we start dig out sub images

            const tiffOffset = formatPt + 4
            let bigEnd // Endianness from TIFF header

            // Test for TIFF validity and endianness
            // 0x4949 and 0x4D4D ('II' and 'MM') marks Little Endian and Big Endian
            if (dataView.getUint16(tiffOffset) === 0x4949) {
              bigEnd = false
            } else if (dataView.getUint16(tiffOffset) === 0x4d4d) {
              bigEnd = true
            } else {
              reject(new Error('No valid endianness marker found in TIFF header'))
              return
            }

            if (dataView.getUint16(tiffOffset + 2, !bigEnd) !== 0x002a) {
              reject(new Error('Not valid TIFF data! (no 0x002A marker)'))
              return
            }

            // 32 bit number stating the offset from the start of the 8 Byte MP Header
            // to MP Index IFD Least possible value is thus 8 (means 0 offset)
            const firstIFDOffset = dataView.getUint32(
              tiffOffset + 4,
              !bigEnd
            )

            if (firstIFDOffset < 0x00000008) {
              reject(new Error('Not valid TIFF data! (First offset less than 8)'))
              return
            }

            // Move ahead to MP Index IFD
            // Assume we're at the first IFD, so firstIFDOffset points to
            // MP Index IFD and not MP Attributes IFD. (If we try extract from a sub image,
            // we fail silently here due to this assumption)
            // Count (2 Byte) | MP Index Fields a.k.a. MP Entries (count * 12 Byte) | Offset of Next IFD (4 Byte)
            const dirStart = tiffOffset + firstIFDOffset // Start of IFD (Image File Directory)
            const count = dataView.getUint16(dirStart, !bigEnd) // Count of MPEntries (2 Byte)

            // Extract info from MPEntries (starting after Count)
            const entriesStart = dirStart + 2
            let numberOfImages = 0
            for (
              let i = entriesStart;
              i < entriesStart + 12 * count;
              i += 12
            ) {
              // Each entry is 12 Bytes long
              // Check MP Index IFD tags, here we only take tag 0xb001 = Number of images
              if (dataView.getUint16(i, !bigEnd) === 0xb001) {
                // stored in Last 4 bytes of its 12 Byte entry.
                numberOfImages = dataView.getUint32(i + 8, !bigEnd)
              }
            }

            const nextIFDOffsetLen = 4 // 4 Byte offset field that appears after MP Index IFD tags
            const MPImageListValPt = dirStart + 2 + count * 12 + nextIFDOffsetLen
            const images: MPFImage[] = []

            for (let i = MPImageListValPt; i < MPImageListValPt + numberOfImages * 16; i += 16) {
              const image: MPFImage = {
                MPType: dataView.getUint32(i, !bigEnd),
                size: dataView.getUint32(i + 4, !bigEnd),
                // This offset is specified relative to the address of the MP Endian
                // field in the MP Header, unless the image is a First Individual Image,
                // in which case the value of the offset shall be NULL (0x00000000).
                dataOffset: dataView.getUint32(i + 8, !bigEnd),
                dependantImages: dataView.getUint32(i + 12, !bigEnd),
                start: -1,
                end: -1,
                isFII: false
              }

              if (!image.dataOffset) {
                // dataOffset is 0x00000000 for First Individual Image
                image.start = 0
                image.isFII = true
              } else {
                image.start = tiffOffset + image.dataOffset
                image.isFII = false
              }
              image.end = image.start + image.size
              images.push(image)
            }

            if (this.options.extractNonFII && images.length) {
              const bufferBlob = new Blob([dataView])
              const imgs: Blob[] = []
              for (const image of images) {
                if (image.isFII && !this.options.extractFII) {
                  continue // Skip FII
                }
                const imageBlob = bufferBlob.slice(image.start, image.end + 1, 'image/jpeg')
                // we don't need this
                // const imageUrl = URL.createObjectURL(imageBlob)
                // image.img = document.createElement('img')
                // image.img.src = imageUrl

                imgs.push(imageBlob)
              }
              resolve(imgs)
            }
          }
        }
        offset += 2 + dataView.getUint16(offset + 2)
      }
    })
  }
}
