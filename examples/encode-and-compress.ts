/* eslint-disable unused-imports/no-unused-vars */
import { encodeAndCompress, findTextureMinMax } from '@monogrid/gainmap-js'
import { encodeJPEGMetadata } from '@monogrid/gainmap-js/libultrahdr'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'

// load an HDR file
const loader = new EXRLoader()
const image = await loader.loadAsync('image.exr')

// find RAW RGB Max value of a texture
const textureMax = await findTextureMinMax(image)

// Encode the gainmap
const encodingResult = await encodeAndCompress({
  image,
  // this will encode the full HDR range
  maxContentBoost: Math.max.apply(this, textureMax),
  mimeType: 'image/jpeg'
})

// embed the compressed images + metadata into a single
// JPEG file
const jpeg = await encodeJPEGMetadata({
  ...encodingResult,
  sdr: encodingResult.sdr,
  gainMap: encodingResult.gainMap
})

// `jpeg` will be an `Uint8Array` which can be saved somewhere
