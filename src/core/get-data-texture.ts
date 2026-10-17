import { DataTexture, DataTextureLoaderTexData, LinearFilter, LinearSRGBColorSpace, RepeatWrapping, RGBAFormat, UVMapping } from 'three'
/**
 * Utility function to obtain a `DataTexture` from various input formats
 *
 * @category Utility
 * @group Utility
 *
 * @param image
 * @returns
 */
export const getDataTexture = (image: DataTextureLoaderTexData | DataTexture) => {
  let dataTexture: DataTexture

  if (image instanceof DataTexture) {
    if (!(image.image.data instanceof Uint16Array) && !(image.image.data instanceof Float32Array)) {
      throw new Error('Provided image is not HDR')
    }
    dataTexture = image
  } else {
    if (!image.data || !image.width || !image.height) {
      throw new Error('Provided image has no data or size')
    }
    dataTexture = new DataTexture(
      image.data,
      image.width,
      image.height,
      image.format ?? RGBAFormat,
      image.type,
      UVMapping,
      RepeatWrapping,
      RepeatWrapping,
      LinearFilter,
      LinearFilter,
      1,
      'colorSpace' in image && image.colorSpace === 'srgb' ? image.colorSpace : LinearSRGBColorSpace
    )

    // TODO: This tries to detect a raw RGBE and applies flipY
    // see if there's a better way to detect it?
    if ('header' in image && 'gamma' in image) {
      dataTexture.flipY = true
    }
    dataTexture.needsUpdate = true
  }

  return dataTexture
}
