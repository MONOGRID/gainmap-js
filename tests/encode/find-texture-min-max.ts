import * as encode from '@monogrid/gainmap-js/encode'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
/**
 *
 * @param file
 * @returns
 */
export const findTextureMinMaxInBrowser = async (args: {file: string, mode?: 'min' | 'max'}) => {
  // load an HDR file
  const image = await new EXRLoader().loadAsync(args.file)

  // find RAW RGB Max value of a texture
  return encode.findTextureMinMax(image, args.mode)
}
