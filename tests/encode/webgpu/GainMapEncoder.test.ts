import { expect } from '@playwright/test'
import sharp from 'sharp'
import { ACESFilmicToneMapping, AgXToneMapping, CineonToneMapping, LinearToneMapping, NeutralToneMapping, ReinhardToneMapping } from 'three'

import { test } from '../../testWithCoverage'
import { compareEncoderInputsInBrowser, compareEncodersInBrowser, countEncoderRendersInBrowser, encodeAndCompressInBrowser, type EncoderParityArgs } from './encode-webgpu'

test.beforeEach(async ({ page, browserName }) => {
  test.skip(browserName === 'firefox' || browserName === 'webkit', 'WebGPU not fully supported in Firefox and WebKit')
  await page.goto('/tests/testbed-webgpu.html', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('script')).toBeAttached()
})

type ParityResult = Awaited<ReturnType<typeof compareEncodersInBrowser>>

/**
 * The WebGL backend produces exactly the same bytes as the WebGL encoder.
 *
 * The WebGPU backend compiles the same node graph to WGSL: drivers are free to fuse operations
 * and implement transcendental functions differently, a few values (well below 0.01%)
 * can land on the other side of a rounding boundary and differ by 1
 *
 * Software renderers (SwiftShader in docker / CI) are less consistent between the two
 * compiled shaders, on both backends: values differ by 1 for up to 0.2% of the image
 *
 * @param result
 * @param exact
 */
const expectParity = (result: ParityResult, exact: boolean) => {
  expect(result.width).toBe(result.legacyWidth)
  expect(result.height).toBe(result.legacyHeight)
  expect(result.metadata).toEqual(result.legacyMetadata)
  const maxRatio = result.softwareRenderer ? 0.002 : 0.0001
  for (const image of ['sdr', 'gainMap'] as const) {
    const { maxDifference, differentValues, totalValues } = result[image]
    if (exact && !result.softwareRenderer) {
      expect(differentValues, `${image} differs from the WebGL encoder (max difference ${maxDifference})`).toBe(0)
    } else {
      expect(maxDifference, `${image} differs from the WebGL encoder by more than 1`).toBeLessThanOrEqual(1)
      expect(differentValues / totalValues, `too many ${image} values differ from the WebGL encoder (${differentValues})`).toBeLessThan(maxRatio)
    }
  }
}

const file = 'files/memorial.exr'

const toneMappings = {
  ACESFilmicToneMapping,
  ReinhardToneMapping,
  CineonToneMapping,
  LinearToneMapping,
  AgXToneMapping,
  NeutralToneMapping
}

// three.js TSL tone mappings differ from the GLSL ones of the WebGL encoder,
// only LinearToneMapping produces the same SDR rendition
test('encodes the same as the WebGL encoder with LinearToneMapping (WebGPU node)', async ({ page }) => {
  expectParity(await page.evaluate(compareEncodersInBrowser, { file, toneMapping: LinearToneMapping }), false)
})

test('encodes exactly the same as the WebGL encoder with LinearToneMapping on the WebGL backend (WebGPU node)', async ({ page }) => {
  expectParity(await page.evaluate(compareEncodersInBrowser, { file, toneMapping: LinearToneMapping, forceWebGL: true }), true)
})

test('applies three.js tone mappings to the SDR rendition (WebGPU node)', async ({ page }) => {
  const means: Record<string, number> = {}
  for (const [name, toneMapping] of Object.entries(toneMappings)) {
    const result = await page.evaluate(compareEncodersInBrowser, { file, toneMapping })
    expect(result.metadata, `${name} changed the metadata`).toEqual(result.legacyMetadata)
    expect(result.sdrMean, `${name} rendered an empty SDR rendition`).toBeGreaterThan(10)
    expect(result.sdrMean, `${name} rendered a blown out SDR rendition`).toBeLessThan(245)
    means[name] = result.sdrMean
  }
  // every tone mapping is actually applied
  expect(new Set(Object.values(means)).size, JSON.stringify(means)).toBe(Object.keys(means).length)
})

const customParameters: EncoderParityArgs = {
  file,
  toneMapping: LinearToneMapping,
  gamma: [1.3, 1.3, 1.3],
  maxContentBoost: 2,
  minContentBoost: 1.3,
  offsetHdr: [1 / 20, 1 / 20, 1 / 20],
  offsetSdr: [1 / 20, 1 / 20, 1 / 20],
  // brightness, contrast and saturation are applied after tone mapping:
  // three.js LinearToneMapping clamps, the WebGL encoder doesn't, results differ on HDR values
  exposure: 0.8
}

test('encodes the same as the WebGL encoder with custom parameters (WebGPU node)', async ({ page }) => {
  expectParity(await page.evaluate(compareEncodersInBrowser, customParameters), false)
})

test('encodes exactly the same as the WebGL encoder with custom parameters on the WebGL backend (WebGPU node)', async ({ page }) => {
  expectParity(await page.evaluate(compareEncodersInBrowser, { ...customParameters, forceWebGL: true }), true)
})

test('encodes the same as the WebGL encoder after changing parameters (WebGPU node)', async ({ page }) => {
  expectParity(await page.evaluate(compareEncodersInBrowser, { ...customParameters, changeAfterFirstRender: true }), false)
})

test('encodes exactly the same as the WebGL encoder after changing parameters on the WebGL backend (WebGPU node)', async ({ page }) => {
  expectParity(await page.evaluate(compareEncodersInBrowser, { ...customParameters, changeAfterFirstRender: true, forceWebGL: true }), true)
})

test('finds the exact min and max values (WebGPU node)', async ({ page }) => {
  const result = await page.evaluate(compareEncodersInBrowser, { file })
  expect(result.webgpuMax).toEqual(result.cpuMax)
  expect(result.webgpuMin).toEqual(result.cpuMin)
})

test('renders the nodes only when something changed (WebGPU node)', async ({ page }) => {
  const result = await page.evaluate(countEncoderRendersInBrowser, { file })
  expect(result.phases).toEqual([
    { sdr: 1, gainMap: 1, preview: 1 }, // first render
    { sdr: 0, gainMap: 0, preview: 0 }, // nothing changed
    { sdr: 0, gainMap: 1, preview: 1 }, // gain map parameter
    { sdr: 1, gainMap: 1, preview: 1 }, // sdr parameter
    { sdr: 1, gainMap: 1, preview: 1 }, // tone mapping
    { sdr: 0, gainMap: 0, preview: 1 } // decoding parameter
  ])
  expect(result.metadataFollowed, 'the preview node does not follow the encoder metadata').toBe(true)
})

test('encodes from textures, raw data and nodes (WebGPU node)', async ({ page }) => {
  const result = await page.evaluate(compareEncoderInputsInBrowser, { file })
  expect(result.dataEqualsTexture).toBe(true)
  expect(result.nodeEqualsTexture).toBe(true)
  expect(result.missingSizeError).toMatch(/width and height are required/)
  expect(result.nodeMax).toEqual(result.textureMax)
  expect(result.fitted).toBe(Math.max(...result.textureMax))
})

test('encodes and compresses into a JPEG with gain map (WebGPU node)', async ({ page }) => {
  const result = await page.evaluate(encodeAndCompressInBrowser, { file, mimeType: 'image/jpeg' as const })
  expect(result.sdr).toEqual({ mimeType: 'image/jpeg', width: 512, height: 768 })
  expect(result.gainMap).toEqual({ mimeType: 'image/jpeg', width: 512, height: 768 })
  expect(result.extractedMetadata!.gainMapMax[0]).toBeCloseTo(result.metadata.gainMapMax[0], 4)
  expect(result.extractedMetadata!.hdrCapacityMax).toBeCloseTo(result.metadata.hdrCapacityMax, 4)

  // same snapshot as the WebGL encoder (encode.test.ts): the SDR rendition is upright without any flipY
  const resized = await sharp(Buffer.from(result.jpeg!))
    .resize({ width: 500, height: 500, fit: 'inside' })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer()
  expect(resized).toMatchSnapshot('memorial.exr-encode-result.png')
})

test('encodes and compresses into webp (WebGPU node)', async ({ page }) => {
  const result = await page.evaluate(encodeAndCompressInBrowser, { file, mimeType: 'image/webp' as const })
  expect(result.sdr).toEqual({ mimeType: 'image/webp', width: 512, height: 768 })
  expect(result.gainMap).toEqual({ mimeType: 'image/webp', width: 512, height: 768 })
})
