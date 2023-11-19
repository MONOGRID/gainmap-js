import { CompressedImage, CompressParameters } from './types'

/**
 * Used internally
 *
 * @internal
 * @param canvas
 * @param mimeType
 * @param quality
 * @returns
 */
const canvasToBlob = async (canvas: OffscreenCanvas | HTMLCanvasElement, mimeType: CompressParameters['mimeType'], quality: CompressParameters['quality']) => {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: mimeType, quality: quality || 0.9 })
  }
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((res) => {
      if (res) resolve(res)
      else reject(new Error('Failed to convert canvas to blob'))
    }, mimeType, quality || 0.9)
  })
}

/**
 * Converts a RAW RGBA image buffer into the provided `mimeType` using the provided `quality`
 *
 * @category Compression
 * @group Compression
 * @param params
 * @throws {Error} if the browser does not support [createImageBitmap](https://caniuse.com/createimagebitmap)
 * @throws {Error} if the provided source image cannot be decoded
 * @throws {Error} if the function fails to create a canvas context
 */
export const compress = async (params: CompressParameters): Promise<CompressedImage> => {
  if (typeof createImageBitmap === 'undefined') throw new Error('createImageBitmap() not supported.')
  const { source, mimeType, quality, flipY } = params
  // eslint-disable-next-line no-undef
  let imageBitmapSource: ImageBitmapSource
  if ((source instanceof Uint8Array || source instanceof Uint8ClampedArray) && 'sourceMimeType' in params) {
    imageBitmapSource = new Blob([source], { type: params.sourceMimeType })
  } else if (source instanceof ImageData) {
    imageBitmapSource = source
  } else {
    throw new Error('Invalid source image')
  }
  const img = await createImageBitmap(imageBitmapSource)
  const width = img.width
  const height = img.height

  let canvas: OffscreenCanvas | HTMLCanvasElement
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height)
  } else {
    canvas = document.createElement('canvas')
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to create canvas Context')
  // flip Y
  if (flipY === true) {
    ctx.translate(0, height)
    ctx.scale(1, -1)
  }

  ctx.drawImage(img, 0, 0, width, height)

  const blob = await canvasToBlob(canvas, mimeType, quality || 0.9)

  const data = new Uint8Array(await blob.arrayBuffer())

  return {
    data,
    mimeType,
    width,
    height
  }
}
