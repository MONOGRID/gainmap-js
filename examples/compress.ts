/* eslint-disable unused-imports/no-unused-vars */
import { compress, encode, findTextureMinMax } from '@monogrid/gainmap-js/encode'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'

// load an HDR file
const loader = new EXRLoader()
const image = await loader.loadAsync('image.exr')

// find RAW RGB Max value of a texture
const textureMax = findTextureMinMax(image)

// Encode the gainmap
const encodingResult = encode({
  image,
  // this will encode the full HDR range
  maxContentBoost: Math.max.apply(this, textureMax)
})

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

// `sdr` will contain a JPEG which can be saved somewhere
// `gainMap` will contain a JPEG which can be saved somewhere

// renderers be manually disposed
encodingResult.sdr.dispose()
encodingResult.gainMap.dispose()
