import { expect } from '@playwright/test'
import resolve from '@rollup/plugin-node-resolve'
import { rollup } from 'rollup'

import { test } from '../../../testWithCoverage'

// workers can't use the testbed import map: bundle the worker with three.js, served next to the library build
const WORKER_URL = '/dist/tests/decode-worker.js'

test.beforeAll(async () => {
  const bundle = await rollup({
    input: 'tests/decode/webgpu/worker/decode-worker.js',
    plugins: [resolve()]
  })
  await bundle.write({ file: `.${WORKER_URL}`, format: 'es' })
  await bundle.close()
})

test.beforeEach(async ({ page, browserName }) => {
  test.skip(browserName === 'firefox' || browserName === 'webkit', 'WebGPU not fully supported in Firefox and WebKit')
  await page.goto('/tests/testbed-webgpu.html', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('script')).toBeAttached()
})

const decodeInWorker = async ({ workerUrl, files }: { workerUrl: string, files: string | string[] }) => {
  // same placement/size as the renderer canvas in testNodeLoaderInBrowser
  const canvas = document.createElement('canvas')
  canvas.style.display = 'block'
  canvas.style.width = `${window.innerWidth}px`
  canvas.style.height = `${window.innerHeight}px`
  document.body.append(canvas)
  const offscreen = canvas.transferControlToOffscreen()

  // worker urls resolve against the worker script, send absolute ones
  const absolute = (url: string) => new URL(url, location.href).href
  const worker = new Worker(workerUrl, { type: 'module' })
  const result = await new Promise<{ width: number, height: number, error?: string }>((resolve, reject) => {
    worker.onmessage = ({ data }) => { resolve(data as { width: number, height: number, error?: string }) }
    worker.onerror = (e) => { reject(new Error(e.message)) }
    worker.postMessage({
      canvas: offscreen,
      files: typeof files === 'string' ? absolute(files) : files.map(absolute),
      width: window.innerWidth,
      height: window.innerHeight
    }, [offscreen])
  })
  if (result.error) throw new Error(result.error)
  return result
}

// screenshots are copies of the HDRJPGNodeLoader / GainMapNodeLoader main thread ones:
// decoding in a worker must render the same

test('decodes a jpeg in a web worker (WebGPU node)', async ({ page }) => {
  const result = await page.evaluate(decodeInWorker, { workerUrl: WORKER_URL, files: 'files/spruit_sunrise_4k.jpg' })
  expect(result).toEqual({ width: 4096, height: 2048 })
  await expect(page).toHaveScreenshot('render.png')
})

test('decodes separate files in a web worker (WebGPU node)', async ({ page }) => {
  const result = await page.evaluate(decodeInWorker, {
    workerUrl: WORKER_URL,
    files: ['files/spruit_sunrise_4k.webp', 'files/spruit_sunrise_4k-gainmap.webp', 'files/spruit_sunrise_4k.json']
  })
  expect(result).toEqual({ width: 4096, height: 2048 })
  await expect(page).toHaveScreenshot('render-webp.png')
})
