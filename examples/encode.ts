/* eslint-disable unused-imports/no-unused-vars */
import { encode } from 'gainmap-js'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'

// load an HDR file
const loader = new EXRLoader()
const image = await loader.loadAsync('image.exr')

// Encode the gainmap
const encodingResult = encode({
  image,
  maxContentBoost: 4
})
