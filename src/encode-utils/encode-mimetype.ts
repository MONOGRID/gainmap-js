import { EncodeMimetypeParameters } from '../types'

/**
 *
 * @param params
 */
export const convertImageBufferToMimetype = async ({ source, sourceMimeType, outMimeType, quality }: EncodeMimetypeParameters) => {
  // eslint-disable-next-line no-undef
  let imageBitmapSource: ImageBitmapSource
  if (source instanceof Uint8Array || source instanceof Uint8ClampedArray) {
    imageBitmapSource = new Blob([source], { type: sourceMimeType })
  } else {
    imageBitmapSource = source
  }
  const img = await createImageBitmap(imageBitmapSource, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })
  const width = img.width
  const height = img.height
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('???')
  ctx.drawImage(img, 0, 0, width, height)

  const blob = await canvas.convertToBlob({ type: outMimeType, quality: quality || 0.9 })

  const arrBuffer = new Uint8Array(await blob.arrayBuffer())

  return {
    data: arrBuffer,
    width,
    height
  }
}
