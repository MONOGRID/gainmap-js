import { DataTexture, LinearFilter, NoColorSpace, RepeatWrapping, RGBAFormat, UVMapping } from 'three'
import { EXR } from 'three/examples/jsm/loaders/EXRLoader'
import { LogLuv } from 'three/examples/jsm/loaders/LogLuvLoader'
import { RGBE } from 'three/examples/jsm/loaders/RGBELoader'
/**
 * Utility function to obtain a `DataTexture` from various input formats
 *
 * @param image
 * @returns
 */
export const getDataTexture = (image: EXR | RGBE | LogLuv | DataTexture) => {
  let dataTexture: DataTexture

  if (image instanceof DataTexture) {
    if (!(image.image.data instanceof Uint16Array) && !(image.image.data instanceof Float32Array)) {
      throw new Error('Provided image is not HDR')
    }
    dataTexture = image
  } else {
    dataTexture = new DataTexture(
      image.data,
      image.width,
      image.height,
      'format' in image ? image.format : RGBAFormat,
      image.type,
      UVMapping,
      RepeatWrapping,
      RepeatWrapping,
      LinearFilter,
      LinearFilter,
      16,
      'colorSpace' in image && image.colorSpace === 'srgb' ? image.colorSpace : NoColorSpace
    )
    dataTexture.needsUpdate = true
  }

  return dataTexture
}
