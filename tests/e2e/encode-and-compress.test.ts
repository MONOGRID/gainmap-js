import 'jest-extended'

import { describe, expect, it } from '@jest/globals'
import { toMatchImageSnapshot } from 'jest-image-snapshot'
import sharp from 'sharp'
import { ACESFilmicToneMapping, LinearToneMapping } from 'three'

import { encodeAndCompress } from '../../src/encode'
import { getPage } from './common'

expect.extend({ toMatchImageSnapshot })

const matrix: [string, string, number, number][] = [
  ['memorial.exr', 'jpg', 0.7, ACESFilmicToneMapping],
  ['memorial.exr', 'webp', 0.7, ACESFilmicToneMapping],
  ['memorial.exr', 'png', 0.7, ACESFilmicToneMapping],

  ['memorial.hdr', 'jpg', 0.7, ACESFilmicToneMapping],
  ['memorial.hdr', 'webp', 0.7, ACESFilmicToneMapping],
  ['memorial.hdr', 'png', 0.7, ACESFilmicToneMapping],

  ['memorial.exr', 'jpg', 0.7, LinearToneMapping],
  ['memorial.exr', 'webp', 0.7, LinearToneMapping],
  ['memorial.exr', 'png', 0.7, LinearToneMapping],

  ['memorial.hdr', 'jpg', 0.7, LinearToneMapping],
  ['memorial.hdr', 'webp', 0.7, LinearToneMapping],
  ['memorial.hdr', 'png', 0.7, LinearToneMapping],

  ['spruit_sunrise_1k.hdr', 'jpg', 0.95, LinearToneMapping]
]

describe('encode-and-compress', () => {
  it.each(matrix)('encodes %p to %p using quality %p, tonemapping: %p', async (file, format, quality, tonemapping) => {
    const { page, pageError, pageLog } = await getPage('base')

    await page.addScriptTag({
      type: 'module',
      url: 'scripts/encode-and-compress.js'
    })

    const result = await page.evaluate(`
        encodeAndCompress(
          '${file}',
          'image/${format === 'jpg' ? 'jpeg' : format}',
          ${quality},
          ${tonemapping}
      )`) as Awaited<ReturnType<typeof encodeAndCompress>> & { textureMax: [number, number, number] }

    expect(pageError).not.toBeCalled()
    // expect no calls to page log except the one indicated
    expect(pageLog).not.toBeCalledWith(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      expect.not.stringMatching(/GPU stall due to ReadPixels/)
    )

    // we receive Arrays because puppeteer can't transfer Uint8Array data
    result.gainMap.data = Uint8Array.from(result.gainMap.data)
    result.sdr.data = Uint8Array.from(result.sdr.data)

    expect(result.gainMapMin).toBeArrayOfSize(3)
    expect(result.gainMapMax).toBeArrayOfSize(3)

    expect(result.hdrCapacityMin).toBeNumber()
    expect(result.hdrCapacityMax).toBeNumber()

    expect(result.hdrCapacityMin).toBeLessThan(result.hdrCapacityMax)

    expect(result.textureMax).toBeArrayOfSize(3)
    expect(result.textureMax).not.toContain(0)

    expect(result.gamma).toBeArrayOfSize(3)
    expect(result.gamma).toContain(1)

    expect(result.offsetHdr).toBeArrayOfSize(3)
    expect(result.offsetHdr).not.toContain(0)

    expect(result.offsetSdr).toBeArrayOfSize(3)
    expect(result.offsetSdr).not.toContain(0)

    expect(result.gainMap).toBeObject()
    expect(result.gainMap.data).toBeInstanceOf(Uint8Array)
    expect(result.gainMap.data.length).toBeGreaterThan(4)

    expect(result.gainMap.width).toBeNumber()
    expect(result.gainMap.width).not.toBeNaN()
    expect(result.gainMap.width).not.toBe(0)

    expect(result.gainMap.height).toBeNumber()
    expect(result.gainMap.height).not.toBeNaN()
    expect(result.gainMap.height).not.toBe(0)

    expect(result.sdr).toBeObject()
    expect(result.sdr.data).toBeInstanceOf(Uint8Array)
    expect(result.sdr.data.length).toBeGreaterThan(4)

    expect(result.sdr.width).toBeNumber()
    expect(result.sdr.height).not.toBeNaN()
    expect(result.sdr.width).not.toBe(0)

    expect(result.sdr.height).toBeNumber()
    expect(result.sdr.height).not.toBeNaN()
    expect(result.sdr.height).not.toBe(0)

    expect({
      offsetSdr: result.offsetSdr,
      offsetHdr: result.offsetHdr,
      gamma: result.gamma,
      hdrCapacityMin: result.hdrCapacityMin,
      hdrCapacityMax: result.hdrCapacityMax,
      gainMapMin: result.gainMapMin,
      gainMapMax: result.gainMapMax
    }).toMatchSnapshot('metadata')

    expect(
      await sharp(result.sdr.data)
        .resize({ width: 500, height: 500, fit: 'inside' })
        .png({ compressionLevel: 9, effort: 10 })
        .toBuffer()
    ).toMatchImageSnapshot({
      comparisonMethod: 'ssim',
      failureThreshold: 0.015, // 1.5% difference
      failureThresholdType: 'percent'
    })
    expect(
      await sharp(result.gainMap.data)
        .resize({ width: 500, height: 500, fit: 'inside' })
        .png({ compressionLevel: 9, effort: 10 })
        .toBuffer()
    ).toMatchImageSnapshot({
      comparisonMethod: 'ssim',
      failureThreshold: 0.015, // 1.5% difference
      failureThresholdType: 'percent'
    })

    await page.close()
  }, 900000 /* 15 minutes */)
})
