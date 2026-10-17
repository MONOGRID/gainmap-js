import { readFileSync } from 'node:fs'

import { expect, type Page } from '@playwright/test'

import { encodeAndCompressInBrowser } from '../../encode/encode-and-compress'
import { test } from '../../testWithCoverage'
import { extractISOFromFileInBrowser, extractMetadataInBrowser } from './extractISO'

const ISO_NAMESPACE = Array.from('urn:iso:std:iso:ts:21496:-1\0', c => c.charCodeAt(0))

const indexesOf = (haystack: number[], needle: number[]) => {
  const result: number[] = []
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    if (needle.every((b, j) => haystack[i + j] === b)) result.push(i)
  }
  return result
}

const encodeMemorial = async (page: Page) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('script')).toBeAttached()
  return page.evaluate(encodeAndCompressInBrowser, { file: 'files/memorial.exr' })
}

const expectMetadataClose = (actual: Record<string, number | number[]>, expected: Record<string, number | number[]>, precision = 5) => {
  expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort())
  for (const key of Object.keys(expected)) {
    const a = [actual[key]].flat()
    const e = [expected[key]].flat()
    expect(a.length).toBe(e.length)
    a.forEach((v, i) => expect(v).toBeCloseTo(e[i], precision))
  }
}

test('encoded jpeg contains ISO 21496-1 and XMP metadata which agree', async ({ page }) => {
  const jpeg = await encodeMemorial(page)

  // version-only block in primary image, full block in gain map image
  expect(indexesOf(jpeg, ISO_NAMESPACE)).toHaveLength(2)

  const { iso, xmp, extracted } = await page.evaluate(extractMetadataInBrowser, jpeg)
  expect(iso).toBeDefined()
  expect(xmp).toBeDefined()
  expectMetadataClose(iso!, xmp!)

  // ISO is preferred, MPF offsets still point to the gain map
  expect(extracted).toBeDefined()
  expect(extracted!.metadata).toEqual(iso)
  expect(extracted!.gainMapStartsWithSOI).toBe(true)
  expect(extracted!.gainMapEndsWithEOI).toBe(true)
})

test('decodes using ISO 21496-1 metadata when XMP is missing', async ({ page }) => {
  const jpeg = await encodeMemorial(page)

  // break the XMP gain map metadata (same length, keeps offsets valid)
  const tag = Array.from('hdrgm:HDRCapacityMax', c => c.charCodeAt(0))
  for (const i of indexesOf(jpeg, tag)) jpeg[i + 6] = 'X'.charCodeAt(0)

  const { iso, xmp, extracted } = await page.evaluate(extractMetadataInBrowser, jpeg)
  expect(xmp).toBeUndefined()
  expect(iso).toBeDefined()
  expect(extracted!.metadata).toEqual(iso)
})

test('falls back to XMP when ISO 21496-1 metadata is unsupported', async ({ page }) => {
  const jpeg = await encodeMemorial(page)

  // set minimum_version = 1 in the full (gain map) ISO block
  const [, fullBlock] = indexesOf(jpeg, ISO_NAMESPACE)
  jpeg[fullBlock + ISO_NAMESPACE.length + 1] = 1

  const { iso, xmp, extracted } = await page.evaluate(extractMetadataInBrowser, jpeg)
  expect(iso).toBeUndefined()
  expect(xmp).toBeDefined()
  expect(extracted!.metadata).toEqual(xmp)
})

test('parses multichannel ISO 21496-1 metadata with common denominator', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('script')).toBeAttached()

  const payload: number[] = []
  const u16 = (v: number) => payload.push((v >> 8) & 0xff, v & 0xff)
  const u32 = (v: number) => payload.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff)
  u16(0) // minimum_version
  u16(0) // writer_version
  payload.push((1 << 7) | (1 << 3)) // multichannel + common denominator
  u32(64) // common denominator
  u32(0) // base headroom
  u32(128) // alternate headroom = 2
  for (let c = 0; c < 3; c++) {
    u32(-64 >>> 0) // gain map min = -1
    u32(64 * (c + 1)) // gain map max = c + 1
    u32(64) // gamma = 1
    u32(1) // base offset = 1/64
    u32(2) // alternate offset = 2/64
  }

  const segment = [...ISO_NAMESPACE, ...payload]
  const jpeg = [0xff, 0xd8, 0xff, 0xe2, ((segment.length + 2) >> 8) & 0xff, (segment.length + 2) & 0xff, ...segment, 0xff, 0xd9]

  const { iso } = await page.evaluate(extractMetadataInBrowser, jpeg)
  expect(iso).toEqual({
    gainMapMin: [-1, -1, -1],
    gainMapMax: [1, 2, 3],
    gamma: [1, 1, 1],
    offsetSdr: [1 / 64, 1 / 64, 1 / 64],
    offsetHdr: [2 / 64, 2 / 64, 2 / 64],
    hdrCapacityMin: 0,
    hdrCapacityMax: 2
  })
})

test('returns undefined for a jpeg without ISO 21496-1 metadata', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('script')).toBeAttached()

  const iso = await page.evaluate(extractISOFromFileInBrowser, 'files/spruit_sunrise_4k.jpg')
  expect(iso).toBeUndefined()
})

// Sample files from Skia (https://github.com/google/skia/tree/main/resources/images, BSD-3-Clause)
// expected values from Skia's tests/JpegGainmapTest.cpp, converted to log2 where needed
const readFixture = (name: string) => Array.from(readFileSync(`tests/files/${name}`))

test('extracts ISO 21496-1 metadata from a third party jpeg (skia, ISO + Adobe XMP)', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('script')).toBeAttached()

  const { iso, xmp, extracted } = await page.evaluate(extractMetadataInBrowser, readFixture('skia-gainmap-iso21496-1-adobe-gcontainer.jpg'))

  const expected = {
    gainMapMin: [Math.log2(25), Math.log2(0.5), Math.log2(1)],
    gainMapMax: [Math.log2(2), Math.log2(4), Math.log2(8)],
    gamma: [2, 1, 0.5],
    offsetSdr: [0.01, 0.001, 0.0001],
    offsetHdr: [0.0001, 0.001, 0.01],
    hdrCapacityMin: 1,
    hdrCapacityMax: 2
  }
  // skia stores fractions with limited precision
  expect(iso).toBeDefined()
  expectMetadataClose(iso!, expected, 3)
  // the XMP stored in the same file agrees with the ISO metadata
  expect(xmp).toBeDefined()
  expectMetadataClose(xmp!, expected, 3)

  expect(extracted).toBeDefined()
  expect(extracted!.metadata).toEqual(iso)
  expect(extracted!.gainMapStartsWithSOI).toBe(true)
  expect(extracted!.gainMapEndsWithEOI).toBe(true)
})

test('does not extract ISO 21496-1 metadata with HDR base image (skia, ISO only)', async ({ page }) => {
  await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('script')).toBeAttached()

  const { iso, xmp, extracted } = await page.evaluate(extractMetadataInBrowser, readFixture('skia-gainmap-iso21496-1-hdr-base.jpg'))

  // base headroom (2) > alternate headroom (1): the base image is HDR, which is not supported
  expect(iso).toBeUndefined()
  expect(xmp).toBeUndefined()
  expect(extracted).toBeUndefined()
})
