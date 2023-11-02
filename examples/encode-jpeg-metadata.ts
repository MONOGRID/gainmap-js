/* eslint-disable unused-imports/no-unused-vars */
import { compress, encode } from 'gainmap-js'
import { encodeJPEGMetadata } from 'gainmap-js/libultrahdr'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'

// load an HDR file
const loader = new EXRLoader()
const image = await loader.loadAsync('image.exr')

// Encode the gainmap
const encodingResult = encode({
  image,
  maxContentBoost: 4
})


// this many lines should produce an eslint error


// obtain the RAW RGBA SDR buffer and create an ImageData
const sdrImageData = new ImageData(encodingResult.sdr.toArray(), encodingResult.sdr.width, encodingResult.sdr.height)
// obtain the RAW RGBA Gain map buffer and create an ImageData
const gainMapImageData = new ImageData(encodingResult.gainMap.toArray(), encodingResult.gainMap.width, encodingResult.gainMap.height)

// parallel compress the RAW buffers into the specified mimeType
const mimeType = 'image/jpeg'
const quality = 0.9

const [sdr, gainMap] = await Promise.all([
  compress({
    source: sdrImageData,
    mimeType,
    quality,
    flipY: true // output needs to be flipped
  }),
  compress({
    source: gainMapImageData,
    mimeType,
    quality,
    flipY: true // output needs to be flipped
  })
])

// obtain the metadata which will be embedded into
// and XMP tag inside the final JPEG file
const metadata = encodingResult.getMetadata()

// embed the compressed images + metadata into a single
// JPEG file
const jpeg = await encodeJPEGMetadata({
  ...encodingResult,
  ...metadata,
  sdr,
  gainMap
})

// `jpeg` will be an `Uint8Array` which can be saved somewhere
