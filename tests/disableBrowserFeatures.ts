export const disableCreateImageBitmap = () => {
  // @ts-expect-error this is intentional
  window.createImageBitmap = undefined
}
export const disableOffscreenCanvas = () => {
  // @ts-expect-error this is intentional
  window.OffscreenCanvas = undefined
}
export const throwOnCanvasToBlob = () => {
  window.HTMLCanvasElement.prototype.toBlob = function () { throw new Error('error') }
}
export const returnNullOnCanvasToBlob = () => {
  window.HTMLCanvasElement.prototype.toBlob = function (cb) { cb(null) }
}
export const throwOnCanvasGetContext = () => {
  window.HTMLCanvasElement.prototype.getContext = function () { throw new Error('error') }
}
export const returnNullOnCanvasGetContext = () => {
  window.HTMLCanvasElement.prototype.getContext = function () { return null }
}
