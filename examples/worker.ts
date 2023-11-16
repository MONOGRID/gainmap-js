/* eslint-disable unused-imports/no-unused-vars */
import { encodeAndCompress, findTextureMinMax } from '@monogrid/gainmap-js/encode'
import { encodeJPEGMetadata } from '@monogrid/gainmap-js/libultrahdr'
// this assumes a vite-like bundler understands the `?worker` import
import GainMapWorker from '@monogrid/gainmap-js/worker?worker'
import { getPromiseWorker, getWorkerInterface } from '@monogrid/gainmap-js/worker-interface'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'

// turn our Worker into a PromiseWorker
const promiseWorker = getPromiseWorker(new GainMapWorker())
// get the interface
const workerInterface = getWorkerInterface(promiseWorker)

// load an HDR file
const loader = new EXRLoader()
const image = await loader.loadAsync('image.exr')

// find RAW RGB Max value of a texture
const textureMax = findTextureMinMax(image)

// Encode the gainmap
const encodingResult = await encodeAndCompress({
  image,
  // this will encode the full HDR range
  maxContentBoost: Math.max.apply(this, textureMax),
  // use our worker for compressing the image
  withWorker: workerInterface,
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
