import * as decode from '@monogrid/gainmap-js'
import { expect } from '@playwright/test'
import * as THREE from 'three'

import { test } from '../../testWithCoverage'

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

test('loads from webp', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  await page.evaluate(async () => {
    const renderer = new THREE.WebGLRenderer()
    document.body.append(renderer.domElement)
    renderer.setSize(window.innerWidth, window.innerHeight)
    const loader = new decode.GainMapLoader(renderer)

    const result = await loader.loadAsync([
      'files/spruit_sunrise_4k.webp',
      'files/spruit_sunrise_4k-gainmap.webp',
      'files/spruit_sunrise_4k.json'
    ])

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
  })

  await expect(page).toHaveScreenshot('render.png')
})

test('throws with an invalid sdr', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(async () => {
      const loader = new decode.GainMapLoader(new THREE.WebGLRenderer())
      await loader.loadAsync([
        'files/invalid_image.png',
        'files/spruit_sunrise_4k-gainmap.webp',
        'files/spruit_sunrise_4k.json'
      ])
    })
  }

  await expect(shouldThrow).rejects.toThrow(/The source image could not be decoded/)
})

test('throws with an invalid gainmap', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(async () => {
      const loader = new decode.GainMapLoader(new THREE.WebGLRenderer())
      await loader.loadAsync([
        'files/spruit_sunrise_4k.webp',
        'files/invalid_image.png',
        'files/spruit_sunrise_4k.json'
      ])
    })
  }

  await expect(shouldThrow).rejects.toThrow(/The source image could not be decoded/)
})

test('throws with it doesn\'t find the sdr', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(async () => {
      const loader = new decode.GainMapLoader(new THREE.WebGLRenderer())
      await loader.loadAsync([
        'nope',
        'files/spruit_sunrise_4k-gainmap.webp',
        'files/spruit_sunrise_4k.json'
      ])
    })
  }

  await expect(shouldThrow).rejects.toThrow(/404/)
})

test('throws with it doesn\'t find the gainmap', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(async () => {
      const loader = new decode.GainMapLoader(new THREE.WebGLRenderer())
      await loader.loadAsync([
        'files/spruit_sunrise_4k.webp',
        'nope',
        'files/spruit_sunrise_4k.json'
      ])
    })
  }

  await expect(shouldThrow).rejects.toThrow(/404/)
})

test('throws with it doesn\'t find the metadata', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const shouldThrow = async () => {
    await page.evaluate(async () => {
      const loader = new decode.GainMapLoader(new THREE.WebGLRenderer())
      await loader.loadAsync([
        'files/spruit_sunrise_4k.webp',
        'files/spruit_sunrise_4k-gainmap.webp',
        'nope'
      ])
    })
  }

  await expect(shouldThrow).rejects.toThrow(/404/)
})
