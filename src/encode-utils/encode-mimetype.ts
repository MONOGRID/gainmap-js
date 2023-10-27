import { EncodeMimetypeParameters } from '../types'

/**
 * Converts a RAW RGBA image buffer into the provided `mimeType` using the provided `quality`
 *
 * @category Encoding Functions
 * @group Encoding Functions
 * @param params
 */
export const convertImageBufferToMimetype = async (params: EncodeMimetypeParameters) => {
  const { source, outMimeType, outQuality, flipY } = params
  // eslint-disable-next-line no-undef
  let imageBitmapSource: ImageBitmapSource
  if ((source instanceof Uint8Array || source instanceof Uint8ClampedArray) && 'sourceMimeType' in params) {
    imageBitmapSource = new Blob([source], { type: params.sourceMimeType })
  } else if (source instanceof ImageData) {
    imageBitmapSource = source
  } else {
    throw new Error('Invalid source')
  }
  const img = await createImageBitmap(imageBitmapSource, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })
  const width = img.width
  const height = img.height
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('???')
  // flip Y
  if (flipY === true) {
    ctx.translate(0, height)
    ctx.scale(1, -1)
  }

  ctx.drawImage(img, 0, 0, width, height)

  const blob = await canvas.convertToBlob({ type: outMimeType, quality: outQuality || 0.9 })

  const arrBuffer = new Uint8Array(await blob.arrayBuffer())

  return {
    data: arrBuffer,
    width,
    height
  }
}
