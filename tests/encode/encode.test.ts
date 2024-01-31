import { ConsoleMessage, expect } from '@playwright/test'
import sharp from 'sharp'
import { ACESFilmicToneMapping, CineonToneMapping, LinearToneMapping, ReinhardToneMapping, ToneMapping } from 'three'

import { extractXMPInBrowser } from '../decode/utils/extractXMP'
import { testMPFExtractorInBrowser } from '../decode/utils/MPFExtractor'
import { test } from '../testWithCoverage'
import { encodeInBrowser } from './encode'

test('encodes from exr', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const result = await page.evaluate(encodeInBrowser, { file: 'files/memorial.exr' })

  // test written metadata
  const meta = await page.evaluate(extractXMPInBrowser, result.jpeg)

  expect(meta, 'metadata was not written').toBeDefined()
  expect(meta!.hdrCapacityMin, 'hdrCapacityMin is not default value').toEqual(Math.log2(1)) // default value
  expect(meta!.gamma, 'gamma is not default value').toEqual([1, 1, 1]) // default value
  expect(meta!.offsetHdr, 'offsetHdr is not default value').toEqual([1 / 64, 1 / 64, 1 / 64]) // default value
  expect(meta!.offsetSdr, 'offsetSdr is not default value').toEqual([1 / 64, 1 / 64, 1 / 64]) // default value
  expect(meta!.gainMapMin, 'gainMapMin is not default value').toEqual([0, 0, 0]) // default value

  const extracted = await page.evaluate(testMPFExtractorInBrowser, result.jpeg)

  const resized = await sharp(Buffer.from(extracted[0]))
    .resize({ width: 500, height: 500, fit: 'inside' })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer()

  expect(resized).toMatchSnapshot('memorial.exr-encode-result.png')

  const resizedGainmap = await sharp(Buffer.from(extracted[1]))
    .resize({ width: 500, height: 500, fit: 'inside' })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer()

  expect(resizedGainmap).toMatchSnapshot('memorial.exr-encode-result-gainmap.png')
})

test('renders the gainmap with custom parameters', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  // everything here is not default
  const gamma = [1.3, 1.3, 1.3] as [number, number, number]
  const maxContentBoost = 2
  const minContentBoost = 1.3
  const offsetHdr = [1 / 20, 1 / 20, 1 / 20] as [number, number, number]
  const offsetSdr = [1 / 20, 1 / 20, 1 / 20] as [number, number, number]

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const result = await page.evaluate(encodeInBrowser, {
    file: 'files/memorial.exr',
    gamma,
    maxContentBoost,
    minContentBoost,
    offsetHdr,
    offsetSdr
  })

  const meta = await page.evaluate(extractXMPInBrowser, result.jpeg)

  const expectedGainMapMin = [Math.log2(minContentBoost), Math.log2(minContentBoost), Math.log2(minContentBoost)]
  const expectedGainMapMax = [Math.log2(maxContentBoost), Math.log2(maxContentBoost), Math.log2(maxContentBoost)]

  expect(meta).toBeDefined()

  expect.soft(meta!.gamma[0], 'written gamma.r does not match input').toBeCloseTo(gamma[0], 4)
  expect.soft(meta!.gamma[1], 'written gamma.g does not match input').toBeCloseTo(gamma[1], 4)
  expect.soft(meta!.gamma[2], 'written gamma.b does not match input').toBeCloseTo(gamma[2], 4)

  expect.soft(meta!.offsetHdr[0], 'written offsetHdr.r does not match input').toBeCloseTo(offsetHdr[0], 4)
  expect.soft(meta!.offsetHdr[1], 'written offsetHdr.g does not match input').toBeCloseTo(offsetHdr[1], 4)
  expect.soft(meta!.offsetHdr[2], 'written offsetHdr.b does not match input').toBeCloseTo(offsetHdr[2], 4)

  expect.soft(meta!.offsetSdr[0], 'written offsetSdr.r does not match input').toBeCloseTo(offsetSdr[0], 4)
  expect.soft(meta!.offsetSdr[1], 'written offsetSdr.g does not match input').toBeCloseTo(offsetSdr[1], 4)
  expect.soft(meta!.offsetSdr[2], 'written offsetSdr.b does not match input').toBeCloseTo(offsetSdr[2], 4)

  expect.soft(meta!.gainMapMin[0], 'written gainMapMin.r does not match input').toBeCloseTo(expectedGainMapMin[0], 4)
  expect.soft(meta!.gainMapMin[1], 'written gainMapMin.g does not match input').toBeCloseTo(expectedGainMapMin[1], 4)
  expect.soft(meta!.gainMapMin[2], 'written gainMapMin.b does not match input').toBeCloseTo(expectedGainMapMin[2], 4)

  expect.soft(meta!.gainMapMax[0], 'written gainMapMax.r does not match input').toBeCloseTo(expectedGainMapMax[0], 4)
  expect.soft(meta!.gainMapMax[1], 'written gainMapMax.g does not match input').toBeCloseTo(expectedGainMapMax[1], 4)
  expect.soft(meta!.gainMapMax[2], 'written gainMapMax.b does not match input').toBeCloseTo(expectedGainMapMax[2], 4)

  expect.soft(meta!.hdrCapacityMin, 'written hdrCapacityMin does not match input').toBeCloseTo(Math.min.apply(this, expectedGainMapMin), 4)
  expect.soft(meta!.hdrCapacityMax, 'written hdrCapacityMax does not match input').toBeCloseTo(Math.max.apply(this, expectedGainMapMax), 4)

  const extracted = await page.evaluate(testMPFExtractorInBrowser, result.jpeg)

  const resizedGainmap = await sharp(Buffer.from(extracted[1]))
    .resize({ width: 500, height: 500, fit: 'inside' })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer()

  expect(resizedGainmap).toMatchSnapshot('memorial.exr-encode-result-custom-params-gainmap.png')
})

test('re-renders the gainmap on demand with custom parameters', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  // everything here is not default
  const gamma = [1.3, 1.3, 1.3] as [number, number, number]
  const maxContentBoost = 2
  const minContentBoost = 1.3
  const offsetHdr = [1 / 20, 1 / 20, 1 / 20] as [number, number, number]
  const offsetSdr = [1 / 20, 1 / 20, 1 / 20] as [number, number, number]

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const result = await page.evaluate(encodeInBrowser, {
    file: 'files/memorial.exr',
    dynamicGainMapParameters: {
      gamma,
      maxContentBoost,
      minContentBoost,
      offsetHdr,
      offsetSdr
    }
  })

  const meta = await page.evaluate(extractXMPInBrowser, result.jpeg)

  const expectedGainMapMin = [Math.log2(minContentBoost), Math.log2(minContentBoost), Math.log2(minContentBoost)]
  const expectedGainMapMax = [Math.log2(maxContentBoost), Math.log2(maxContentBoost), Math.log2(maxContentBoost)]

  expect(meta).toBeDefined()

  expect.soft(meta!.gamma[0], 'written gamma.r does not match input').toBeCloseTo(gamma[0], 4)
  expect.soft(meta!.gamma[1], 'written gamma.g does not match input').toBeCloseTo(gamma[1], 4)
  expect.soft(meta!.gamma[2], 'written gamma.b does not match input').toBeCloseTo(gamma[2], 4)

  expect.soft(meta!.offsetHdr[0], 'written offsetHdr.r does not match input').toBeCloseTo(offsetHdr[0], 4)
  expect.soft(meta!.offsetHdr[1], 'written offsetHdr.g does not match input').toBeCloseTo(offsetHdr[1], 4)
  expect.soft(meta!.offsetHdr[2], 'written offsetHdr.b does not match input').toBeCloseTo(offsetHdr[2], 4)

  expect.soft(meta!.offsetSdr[0], 'written offsetSdr.r does not match input').toBeCloseTo(offsetSdr[0], 4)
  expect.soft(meta!.offsetSdr[1], 'written offsetSdr.g does not match input').toBeCloseTo(offsetSdr[1], 4)
  expect.soft(meta!.offsetSdr[2], 'written offsetSdr.b does not match input').toBeCloseTo(offsetSdr[2], 4)

  expect.soft(meta!.gainMapMin[0], 'written gainMapMin.r does not match input').toBeCloseTo(expectedGainMapMin[0], 4)
  expect.soft(meta!.gainMapMin[1], 'written gainMapMin.g does not match input').toBeCloseTo(expectedGainMapMin[1], 4)
  expect.soft(meta!.gainMapMin[2], 'written gainMapMin.b does not match input').toBeCloseTo(expectedGainMapMin[2], 4)

  expect.soft(meta!.gainMapMax[0], 'written gainMapMax.r does not match input').toBeCloseTo(expectedGainMapMax[0], 4)
  expect.soft(meta!.gainMapMax[1], 'written gainMapMax.g does not match input').toBeCloseTo(expectedGainMapMax[1], 4)
  expect.soft(meta!.gainMapMax[2], 'written gainMapMax.b does not match input').toBeCloseTo(expectedGainMapMax[2], 4)

  expect.soft(meta!.hdrCapacityMin, 'written hdrCapacityMin does not match input').toBeCloseTo(Math.min.apply(this, expectedGainMapMin), 4)
  expect.soft(meta!.hdrCapacityMax, 'written hdrCapacityMax does not match input').toBeCloseTo(Math.max.apply(this, expectedGainMapMax), 4)

  const extracted = await page.evaluate(testMPFExtractorInBrowser, result.jpeg)

  const resizedGainmap = await sharp(Buffer.from(extracted[1]))
    .resize({ width: 500, height: 500, fit: 'inside' })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer()

  expect(resizedGainmap).toMatchSnapshot('memorial.exr-encode-result-custom-params-gainmap.png')
})

const toneMappings: [ToneMapping, string][] = [
  [LinearToneMapping, 'LinearToneMapping'],
  [ACESFilmicToneMapping, 'ACESFilmicToneMapping'],
  [CineonToneMapping, 'CineonToneMapping'],
  [ReinhardToneMapping, 'ReinhardToneMapping'],
  // @ts-expect-error this is purposely invalid
  [-1, 'INVALID']
]

for (const toneMapping of toneMappings) {
  test(`encodes from exr using tone mapping ${toneMapping[1]}`, async ({ page }) => {
    await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

    const logs: string[] = []
    page.on('console', (m: ConsoleMessage) => {
      logs.push(m.text())
    })

    const script = page.getByTestId('script')
    await expect(script).toBeAttached()

    const result = await page.evaluate(encodeInBrowser, { file: 'files/memorial.exr', toneMapping: toneMapping[0] })

    const resized = await sharp(Buffer.from(result.jpeg))
      .resize({ width: 500, height: 500, fit: 'inside' })
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer()

    if (toneMapping[1] === 'INVALID') {
      expect(logs.find(m => m.match(/Unsupported toneMapping/gi))).toBeTruthy()
    }

    expect(resized).toMatchSnapshot(`memorial.exr-encode-result-with-tone-mapping-${toneMapping[1]}.png`)
  })
}

// const maxContentBoosts = [1, 2]

test('encodes from exr with custom sdr parameters', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })

  const script = page.getByTestId('script')
  await expect(script).toBeAttached()

  const result = await page.evaluate(encodeInBrowser, {
    file: 'files/memorial.exr',
    dynamicSDRParameters: {
      contrast: 1.1,
      exposure: 0.9,
      brightness: 0.1,
      saturation: 0
    }
  })

  const resized = await sharp(Buffer.from(result.jpeg))
    .resize({ width: 500, height: 500, fit: 'inside' })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer()

  expect(resized).toMatchSnapshot('memorial.exr-encode-result-custom-sdr-params.png')
})
