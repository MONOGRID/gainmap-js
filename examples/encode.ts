/* eslint-disable unused-imports/no-unused-vars */
import { encode, findTextureMinMax } from '@monogrid/gainmap-js'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'

// load an HDR file
const loader = new EXRLoader()
const image = await loader.loadAsync('image.exr')

// find RAW RGB Max value of a texture
const textureMax = await findTextureMinMax(image)

// Encode the gainmap
const encodingResult = encode({
  image,
  // this will encode the full HDR range
  maxContentBoost: Math.max.apply(this, textureMax)
})

// can be re-encoded after changing parameters
encodingResult.sdr.material.exposure = 0.9
encodingResult.sdr.render()
// or
encodingResult.gainMap.material.gamma = [1.1, 1.1, 1.1]
encodingResult.gainMap.render()

// must be manually disposed
encodingResult.sdr.dispose()
encodingResult.gainMap.dispose()
