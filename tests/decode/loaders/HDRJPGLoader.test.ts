import * as decode from '@monogrid/gainmap-js'
import { expect } from '@playwright/test'
import * as THREE from 'three'

import { test } from '../../testWithCoverage'

const loadFromJpeg = async (args: { file: string, noCreateImageBitmap?: boolean }) => {
  if (args.noCreateImageBitmap === true) {
    // @ts-expect-error forcing our hand here
    window.createImageBitmap = undefined
  }
  const renderer = new THREE.WebGLRenderer()
  document.body.append(renderer.domElement)
  renderer.setSize(window.innerWidth, window.innerHeight)
  const loader = new decode.HDRJPGLoader(renderer)

  const result = await loader.loadAsync(args.file)

  const scene = new THREE.Scene()
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(),
    new THREE.MeshBasicMaterial({ map: result.renderTarget.texture })
  )
  const ratio = result.width / result.height
  plane.scale.y = Math.min(1, 1 / ratio)
  plane.scale.x = Math.min(1, ratio)
  scene.add(plane)

  scene.background = result.toDataTexture({
    mapping: THREE.EquirectangularReflectionMapping,
    minFilter: THREE.LinearFilter,
    generateMipmaps: false
  })
  scene.background.needsUpdate = true

  // result must be manually disposed
  // when you are done using it
  result.dispose()

  const camera = new THREE.PerspectiveCamera()
  camera.position.z = 3
  renderer.render(scene, camera)
}

// const matrix = [
//   '01.jpg',
//   '02.jpg',
//   '03.jpg',
//   '04.jpg',
//   '05.jpg',
//   '06.jpg',
//   '07.jpg',
//   '08.jpg',
//   '09.jpg',
//   '10.jpg',
//   'pisa-4k.jpg',
//   'spruit_sunrise_4k.jpg',
//   'abandoned_bakery_16k.jpg'
// ]

// for (const testFile of matrix) {

// }

test('loads from jpeg', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  await page.evaluate(loadFromJpeg, { file: 'files/spruit_sunrise_4k.jpg' })

  await expect(page).toHaveScreenshot('render.png')
})

test('loads from jpeg in browsers where createImageBitmap is not available', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  await page.evaluate(loadFromJpeg, { file: 'files/spruit_sunrise_4k.jpg', noCreateImageBitmap: true })

  await expect(page).toHaveScreenshot('render-no-create-image-bitmap.png')
})

test('loads a plain jpeg anyway', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  await page.evaluate(loadFromJpeg, { file: 'files/plain-jpeg.jpg' })

  await expect(page).toHaveScreenshot('render-plain.png')
})

test('throws with an invalid image', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(async () => {
      const loader = new decode.HDRJPGLoader(new THREE.WebGLRenderer())
      await loader.loadAsync('files/invalid_image.png')
    })
  }

  await expect(shouldThrow).rejects.toThrow(/The source image could not be decoded/)
})

test('throws with a not found image', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(async () => {
      const loader = new decode.HDRJPGLoader(new THREE.WebGLRenderer())
      await loader.loadAsync('nope')
    })
  }

  await expect(shouldThrow).rejects.toThrow(/404/)
})
