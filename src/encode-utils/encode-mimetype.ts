import { EncodeMimetypeParameters } from '../types'

/**
 * Used internally
 *
 * @internal
 * @param canvas
 * @param outMimeType
 * @param outQuality
 * @returns
 */
const canvasToBlob = async (canvas: OffscreenCanvas | HTMLCanvasElement, outMimeType: EncodeMimetypeParameters['outMimeType'], outQuality: EncodeMimetypeParameters['outQuality']) => {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: outMimeType, quality: outQuality || 0.9 })
  }
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((res) => {
      if (res) resolve(res)
      else reject('Failed to convert canvas to blob')
    }, outMimeType, outQuality || 0.9)
  })
}

/**
 * Converts a RAW RGBA image buffer into the provided `mimeType` using the provided `quality`
 *
 * @category Encoding Functions
 * @group Encoding Functions
 * @param params
 * @throws {Error} if the provided source image cannot be decoded
 * @throws {Error} if the function fails to create a canvas context
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
    throw new Error('Invalid source image')
  }
  const img = await createImageBitmap(imageBitmapSource, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })
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

  const blob = await canvasToBlob(canvas, outMimeType, outQuality || 0.9)

  const arrBuffer = new Uint8Array(await blob.arrayBuffer())

  return {
    data: arrBuffer,
    width,
    height
  }
}
