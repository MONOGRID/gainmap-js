import { expect } from '@playwright/test'

import { test } from '../../../testWithCoverage'

test('QuadRenderer getters and setters (WebGPU)', async ({ page, browserName }) => {
  await page.goto('/tests/testbed-webgpu.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const result = await page.evaluate(async () => {
    const decode = await import('@monogrid/gainmap-js/webgpu')
    const THREE = await import('three/webgpu')

    const renderer = new THREE.WebGPURenderer()
    await renderer.init()

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

    const gainMap = new THREE.Texture(gainMapImageBitmap)
    gainMap.needsUpdate = true

    const sdr = new THREE.Texture(sdrImageBitmap)
    sdr.needsUpdate = true

    // restore the HDR texture
    const result = await decode.decode({
      sdr,
      gainMap,
      renderer,
      maxDisplayBoost: Math.pow(2, metadata.hdrCapacityMax),
      ...metadata
    })

    // Test getters
    const initialWidth = result.width
    const initialHeight = result.height
    const type = result.type
    const colorSpace = result.colorSpace
    const material = result.material
    const renderTarget = result.renderTarget

    // Test setters
    result.width = 512
    result.height = 256

    const newWidth = result.width
    const newHeight = result.height

    // Test renderTarget setter
    const newRT = new THREE.RenderTarget(128, 128)
    result.renderTarget = newRT
    const finalWidth = result.width
    const finalHeight = result.height

    result.dispose()
    renderer.dispose()

    return {
      initialWidth,
      initialHeight,
      newWidth,
      newHeight,
      finalWidth,
      finalHeight,
      hasType: type !== undefined,
      hasColorSpace: colorSpace !== undefined,
      hasMaterial: material !== undefined,
      hasRenderTarget: renderTarget !== undefined
    }
  })

  expect(result.initialWidth).toBeGreaterThan(0)
  expect(result.initialHeight).toBeGreaterThan(0)
  expect(result.newWidth).toBe(512)
  expect(result.newHeight).toBe(256)
  expect(result.finalWidth).toBe(128)
  expect(result.finalHeight).toBe(128)
  expect(result.hasType).toBe(true)
  expect(result.hasColorSpace).toBe(true)
  expect(result.hasMaterial).toBe(true)
  expect(result.hasRenderTarget).toBe(true)
})

test('QuadRenderer toDataTexture with various options (WebGPU)', async ({ page, browserName }) => {
  await page.goto('/tests/testbed-webgpu.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const result = await page.evaluate(async () => {
    const decode = await import('@monogrid/gainmap-js/webgpu')
    const THREE = await import('three/webgpu')

    const renderer = new THREE.WebGPURenderer()
    await renderer.init()

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

    const gainMap = new THREE.Texture(gainMapImageBitmap)
    gainMap.needsUpdate = true

    const sdr = new THREE.Texture(sdrImageBitmap)
    sdr.needsUpdate = true

    // restore the HDR texture
    const quadRenderer = await decode.decode({
      sdr,
      gainMap,
      renderer,
      maxDisplayBoost: Math.pow(2, metadata.hdrCapacityMax),
      ...metadata
    })

    // Test toDataTexture with no options (to cover default parameters)
    const dataTexture1 = await quadRenderer.toDataTexture()

    // Test toDataTexture with some options
    const dataTexture2 = await quadRenderer.toDataTexture({
      flipY: false,
      generateMipmaps: true,
      anisotropy: 4
    })

    // Test toDataTexture with all options
    const dataTexture3 = await quadRenderer.toDataTexture({
      mapping: THREE.EquirectangularReflectionMapping,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.MirroredRepeatWrapping,
      magFilter: THREE.NearestFilter,
      minFilter: THREE.NearestFilter,
      anisotropy: 16,
      flipY: true,
      generateMipmaps: false
    })

    quadRenderer.dispose()
    renderer.dispose()

    return {
      dataTexture1Created: dataTexture1 !== undefined,
      dataTexture2Created: dataTexture2 !== undefined,
      dataTexture3Created: dataTexture3 !== undefined,
      dataTexture1FlipY: dataTexture1.flipY,
      dataTexture2FlipY: dataTexture2.flipY,
      dataTexture3FlipY: dataTexture3.flipY
    }
  })

  expect(result.dataTexture1Created).toBe(true)
  expect(result.dataTexture2Created).toBe(true)
  expect(result.dataTexture3Created).toBe(true)
  expect(result.dataTexture1FlipY).toBe(true)
  expect(result.dataTexture2FlipY).toBe(false)
  expect(result.dataTexture3FlipY).toBe(true)
})

test('QuadRenderer dispose with renderTarget disposal (WebGPU)', async ({ page, browserName }) => {
  await page.goto('/tests/testbed-webgpu.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const result = await page.evaluate(async () => {
    const decode = await import('@monogrid/gainmap-js/webgpu')
    const THREE = await import('three/webgpu')

    try {
      const renderer = new THREE.WebGPURenderer()
      await renderer.init()

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

      const gainMap = new THREE.Texture(gainMapImageBitmap)
      gainMap.needsUpdate = true

      const sdr = new THREE.Texture(sdrImageBitmap)
      sdr.needsUpdate = true

      // restore the HDR texture
      const result = await decode.decode({
        sdr,
        gainMap,
        renderer,
        maxDisplayBoost: Math.pow(2, metadata.hdrCapacityMax),
        ...metadata
      })

      // Test dispose with renderTarget disposal
      result.dispose(true)
      renderer.dispose()

      return true
    } catch (error) {
      return false
    }
  })

  expect(result).toBe(true)
})

test('QuadRenderer without renderer (on-demand renderer) (WebGPU)', async ({ page, browserName }) => {
  await page.goto('/tests/testbed-webgpu.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const result = await page.evaluate(async () => {
    const decode = await import('@monogrid/gainmap-js/webgpu')
    const THREE = await import('three/webgpu')

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

    const gainMap = new THREE.Texture(gainMapImageBitmap)
    gainMap.needsUpdate = true

    const sdr = new THREE.Texture(sdrImageBitmap)
    sdr.needsUpdate = true

    // Create QuadRenderer without providing a renderer
    // This should create an on-demand renderer internally
    const material = new decode.GainMapDecoderMaterial({
      gainMap,
      sdr,
      gainMapMin: metadata.gainMapMin,
      gainMapMax: metadata.gainMapMax,
      gamma: metadata.gamma,
      offsetHdr: metadata.offsetHdr,
      offsetSdr: metadata.offsetSdr,
      hdrCapacityMin: metadata.hdrCapacityMin,
      hdrCapacityMax: metadata.hdrCapacityMax,
      maxDisplayBoost: Math.pow(2, metadata.hdrCapacityMax)
    })

    const quadRenderer = new decode.QuadRenderer({
      width: 512,
      height: 512,
      type: THREE.HalfFloatType,
      colorSpace: THREE.LinearSRGBColorSpace,
      material
      // Note: no renderer provided
    })

    await quadRenderer.render()

    const hasRenderer = quadRenderer.renderer !== undefined

    // Dispose should also dispose the on-demand renderer
    quadRenderer.dispose()

    return {
      hasRenderer
    }
  })

  expect(result.hasRenderer).toBe(true)
})

test('QuadRenderer render with various renderTarget options (WebGPU)', async ({ page, browserName }) => {
  await page.goto('/tests/testbed-webgpu.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const result = await page.evaluate(async () => {
    const decode = await import('@monogrid/gainmap-js/webgpu')
    const THREE = await import('three/webgpu')

    try {
      const renderer = new THREE.WebGPURenderer()
      await renderer.init()

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

      const gainMap = new THREE.Texture(gainMapImageBitmap)
      gainMap.needsUpdate = true

      const sdr = new THREE.Texture(sdrImageBitmap)
      sdr.needsUpdate = true

      // Create QuadRenderer with various renderTarget options
      const material = new decode.GainMapDecoderMaterial({
        gainMap,
        sdr,
        gainMapMin: metadata.gainMapMin,
        gainMapMax: metadata.gainMapMax,
        gamma: metadata.gamma,
        offsetHdr: metadata.offsetHdr,
        offsetSdr: metadata.offsetSdr,
        hdrCapacityMin: metadata.hdrCapacityMin,
        hdrCapacityMax: metadata.hdrCapacityMax,
        maxDisplayBoost: Math.pow(2, metadata.hdrCapacityMax)
      })

      const quadRenderer = new decode.QuadRenderer({
        width: 512,
        height: 512,
        type: THREE.HalfFloatType,
        colorSpace: THREE.LinearSRGBColorSpace,
        material,
        renderer,
        renderTargetOptions: {
          mapping: THREE.EquirectangularReflectionMapping,
          anisotropy: 8,
          generateMipmaps: true,
          magFilter: THREE.NearestFilter,
          minFilter: THREE.NearestMipmapLinearFilter,
          samples: 4,
          wrapS: THREE.RepeatWrapping,
          wrapT: THREE.MirroredRepeatWrapping
        }
      })

      await quadRenderer.render()

      quadRenderer.dispose()
      renderer.dispose()
      return true
    } catch (error) {
      return false
    }
  })

  // If we reach here the test passed
  expect(result).toBe(true)
})
