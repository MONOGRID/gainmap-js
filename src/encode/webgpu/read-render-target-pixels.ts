import { type RenderTarget, type WebGPURenderer } from 'three/webgpu'

/**
 * Reads the pixels of a render target, rows are returned top to bottom
 * (like `ImageData`, regardless of the backend) and tightly packed
 * (WebGPU pads each row to 256 bytes).
 *
 * @internal
 * @param renderer
 * @param renderTarget
 */
export const readRenderTargetPixels = async (renderer: WebGPURenderer, renderTarget: RenderTarget) => {
  const { width, height } = renderTarget
  const data = await renderer.readRenderTargetPixelsAsync(renderTarget, 0, 0, width, height)

  const rowLength = width * 4
  const rowStride = height > 1 ? (data.length - rowLength) / (height - 1) : rowLength
  // the WebGPU backend reads rows bottom to top (render targets are sampled with flipped uvs),
  // the WebGL backend top to bottom
  const flip = (renderer.backend as { isWebGLBackend?: boolean }).isWebGLBackend !== true
  if (rowStride === rowLength && !flip) return data.length === rowLength * height ? data : data.subarray(0, rowLength * height)

  const out = new (data.constructor as new (length: number) => typeof data)(rowLength * height)
  for (let y = 0; y < height; y++) {
    const sourceRow = flip ? height - 1 - y : y
    out.set(data.subarray(sourceRow * rowStride, sourceRow * rowStride + rowLength), y * rowLength)
  }
  return out
}
