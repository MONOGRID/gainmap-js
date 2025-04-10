/**
 * private function, async get image from blob
 *
 * @param blob
 * @returns
 */
export const getHTMLImageFromBlob = (blob: Blob) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = document.createElement('img')
    img.onload = () => { resolve(img) }
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    img.onerror = (e) => { reject(e) }
    img.src = URL.createObjectURL(blob)
  })
}
