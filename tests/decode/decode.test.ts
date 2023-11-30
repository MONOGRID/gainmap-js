import * as decode from '@monogrid/gainmap-js'
import { expect } from '@playwright/test'
import * as THREE from 'three'

import { test } from '../testWithCoverage'

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

test('decodes from jpeg', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  await page.evaluate(async () => {
    const renderer = new THREE.WebGLRenderer()
    document.body.append(renderer.domElement)
    renderer.setSize(window.innerWidth, window.innerHeight)

    // fetch a JPEG image containing a gainmap as ArrayBuffer
    const file = await fetch('files/spruit_sunrise_4k.jpg')
    const fileBuffer = await file.arrayBuffer()
    const jpeg = new Uint8Array(fileBuffer)

    // extract data from the JPEG
    const { gainMap: gainMapBuffer, sdr: sdrBuffer, metadata } = await decode.extractGainmapFromJPEG(jpeg)

    // create data blobs
    const gainMapBlob = new Blob([gainMapBuffer], { type: 'image/jpeg' })
    const sdrBlob = new Blob([sdrBuffer], { type: 'image/jpeg' })

    // create ImageBitmap data
    const [gainMapImageBitmap, sdrImageBitmap] = await Promise.all([
      createImageBitmap(gainMapBlob, { imageOrientation: 'flipY' }),
      createImageBitmap(sdrBlob, { imageOrientation: 'flipY' })
    ])

    // create textures
    const gainMap = new THREE.Texture(gainMapImageBitmap,
      THREE.UVMapping,
      THREE.ClampToEdgeWrapping,
      THREE.ClampToEdgeWrapping,
      THREE.LinearFilter,
      THREE.LinearMipMapLinearFilter,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
      1,
      THREE.LinearSRGBColorSpace
    )

    gainMap.needsUpdate = true

    // create textures
    const sdr = new THREE.Texture(sdrImageBitmap,
      THREE.UVMapping,
      THREE.ClampToEdgeWrapping,
      THREE.ClampToEdgeWrapping,
      THREE.LinearFilter,
      THREE.LinearMipMapLinearFilter,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
      1,
      THREE.SRGBColorSpace
    )

    sdr.needsUpdate = true

    // restore the HDR texture
    const result = decode.decode({
      sdr,
      gainMap,
      renderer,
      maxDisplayBoost: Math.pow(2, metadata.hdrCapacityMax),
      ...metadata
    })

    const scene = new THREE.Scene()

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(),
      new THREE.MeshBasicMaterial({ map: result.renderTarget.texture })
    )
    const ratio = result.width / result.height
    plane.scale.y = Math.min(1, 1 / ratio)
    plane.scale.x = Math.min(1, ratio)

    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5)
    camera.position.z = 10

    scene.add(plane)
    renderer.render(scene, camera)

    result.dispose()
  })

  await expect(page).toHaveScreenshot('render.png')
})
