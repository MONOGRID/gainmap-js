import {
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipMapLinearFilter,
  LinearSRGBColorSpace,
  RGBAFormat,
  SRGBColorSpace,
  Texture,
  UnsignedByteType,
  UVMapping
} from 'three'

import { getHTMLImageFromBlob } from './get-html-image-from-blob'

/**
 * Decodes the SDR and (optional) gain map JPEG buffers into images
 *
 * @param sdrBuffer
 * @param gainMapBuffer
 * @param imageOrientation
 * @returns
 */
export const processImages = async (sdrBuffer: ArrayBuffer, gainMapBuffer?: ArrayBuffer, imageOrientation?: 'flipY' | 'from-image'): Promise<{ sdrImage: ImageBitmap | HTMLImageElement, gainMapImage: ImageBitmap | HTMLImageElement | undefined, needsFlip: boolean }> => {
  const gainMapBlob = gainMapBuffer ? new Blob([gainMapBuffer], { type: 'image/jpeg' }) : undefined
  const sdrBlob = new Blob([sdrBuffer], { type: 'image/jpeg' })

  let sdrImage: ImageBitmap | HTMLImageElement
  let gainMapImage: ImageBitmap | HTMLImageElement | undefined
  let needsFlip = false

  if (typeof createImageBitmap === 'undefined') {
    const res = await Promise.all([
      gainMapBlob ? getHTMLImageFromBlob(gainMapBlob) : Promise.resolve(undefined),
      getHTMLImageFromBlob(sdrBlob)
    ])
    gainMapImage = res[0]
    sdrImage = res[1]
    needsFlip = imageOrientation === 'flipY'
  } else {
    const res = await Promise.all([
      gainMapBlob ? createImageBitmap(gainMapBlob, { imageOrientation: imageOrientation || 'flipY' }) : Promise.resolve(undefined),
      createImageBitmap(sdrBlob, { imageOrientation: imageOrientation || 'flipY' })
    ])
    gainMapImage = res[0]
    sdrImage = res[1]
  }

  return { sdrImage, gainMapImage, needsFlip }
}

/**
 * Creates the SDR (sRGB) and gain map (linear) textures from decoded images
 *
 * @param sdrImage
 * @param gainMapImage
 * @param needsFlip
 * @returns
 */
export const createTextures = (sdrImage: ImageBitmap | HTMLImageElement, gainMapImage: ImageBitmap | HTMLImageElement | undefined, needsFlip: boolean): { gainMap: Texture, sdr: Texture } => {
  const gainMap = new Texture(
    gainMapImage || new ImageData(2, 2),
    UVMapping,
    ClampToEdgeWrapping,
    ClampToEdgeWrapping,
    LinearFilter,
    LinearMipMapLinearFilter,
    RGBAFormat,
    UnsignedByteType,
    1,
    LinearSRGBColorSpace
  )
  gainMap.flipY = needsFlip
  gainMap.needsUpdate = true

  const sdr = new Texture(
    sdrImage,
    UVMapping,
    ClampToEdgeWrapping,
    ClampToEdgeWrapping,
    LinearFilter,
    LinearMipMapLinearFilter,
    RGBAFormat,
    UnsignedByteType,
    1,
    SRGBColorSpace
  )
  sdr.flipY = needsFlip
  sdr.needsUpdate = true

  return { gainMap, sdr }
}
