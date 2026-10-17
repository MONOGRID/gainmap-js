import { readFileSync } from 'node:fs'

import { expect } from '@playwright/test'
import sharp from 'sharp'

import { extractMetadataInBrowser } from '../decode/utils/extractISO'
import { walkJpegWithGainMap } from '../jpeg-segments'
import { test } from '../testWithCoverage'
import { encodeAndCompressInBrowser } from './encode-and-compress'

const XMP = 'APP1:http://ns.adobe.com/xap/1.0/'
const ISO = 'APP2:urn:iso:std:iso:ts:21496:-1'
const MPF = 'APP2:MPF'
const ISO_NAMESPACE_LENGTH = 'urn:iso:std:iso:ts:21496:-1\0'.length

const toHex = (data: Uint8Array) => Buffer.from(data).toString('hex')

test.describe('JPEG encoding with ISO 21496-1 metadata', () => {
  // fixed maxContentBoost so metadata does not depend on GPU min/max precision
  const encodeArgs = { file: 'files/memorial.exr', maxContentBoost: 8 }

  test('writes a valid JPEG with the libultrahdr segment layout', async ({ page }) => {
    await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('script')).toBeAttached()

    const jpeg = Uint8Array.from(await page.evaluate(encodeAndCompressInBrowser, encodeArgs))
    const { primary, gainMap, gainMapOffset } = walkJpegWithGainMap(jpeg)

    // Ultra HDR v1.1 layout (libultrahdr jpegr.cpp):
    // primary: SOI, XMP (GContainer), ISO (version only), MPF, ...
    // gain map: SOI, XMP (hdrgm), ISO (metadata), ...
    expect(primary.slice(0, 4).map(s => s.label)).toEqual(['SOI', XMP, ISO, MPF])
    expect(gainMap.slice(0, 3).map(s => s.label)).toEqual(['SOI', XMP, ISO])
    // exactly one ISO segment per image
    expect(primary.filter(s => s.label === ISO)).toHaveLength(1)
    expect(gainMap.filter(s => s.label === ISO)).toHaveLength(1)

    // primary ISO segment is byte-identical to the one written by skia
    const reference = walkJpegWithGainMap(new Uint8Array(readFileSync('tests/files/skia-gainmap-iso21496-1-adobe-gcontainer.jpg')))
    const referencePrimaryIso = reference.primary.find(s => s.label === ISO)!
    expect(toHex(primary[2].payload)).toBe(toHex(referencePrimaryIso.payload))

    // gain map ISO payload: version 0/0, use base colour space, single channel, 61 bytes
    const isoPayload = gainMap[2].payload.subarray(ISO_NAMESPACE_LENGTH)
    expect(isoPayload.length).toBe(61)
    expect(toHex(isoPayload.subarray(0, 5))).toBe('0000000040')
    expect(toHex(isoPayload)).toMatchSnapshot('iso-gainmap-payload.txt')

    // both images are decodable JPEGs
    const primaryInfo = await sharp(Buffer.from(jpeg.subarray(0, gainMapOffset))).metadata()
    const gainMapInfo = await sharp(Buffer.from(jpeg.subarray(gainMapOffset))).metadata()
    expect(primaryInfo.format).toBe('jpeg')
    expect(gainMapInfo.format).toBe('jpeg')
    expect(gainMapInfo.width).toBe(primaryInfo.width)
    expect(gainMapInfo.height).toBe(primaryInfo.height)
  })

  test('written ISO and XMP metadata round-trip to the encoding metadata', async ({ page }) => {
    await page.goto('/tests/testbed.html', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('script')).toBeAttached()

    const jpeg = await page.evaluate(encodeAndCompressInBrowser, encodeArgs)
    const { iso, xmp } = await page.evaluate(extractMetadataInBrowser, jpeg)

    const expected = {
      gainMapMin: [0, 0, 0],
      gainMapMax: [3, 3, 3],
      gamma: [1, 1, 1],
      offsetSdr: [1 / 64, 1 / 64, 1 / 64],
      offsetHdr: [1 / 64, 1 / 64, 1 / 64],
      hdrCapacityMin: 0,
      hdrCapacityMax: 3
    }
    for (const metadata of [iso, xmp]) {
      expect(metadata).toBeDefined()
      for (const [key, value] of Object.entries(expected)) {
        const actual = [metadata![key as keyof typeof expected]].flat()
        ;[value].flat().forEach((v, i) => expect(actual[i]).toBeCloseTo(v, 6))
      }
    }
  })
})
