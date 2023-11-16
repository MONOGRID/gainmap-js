import 'jest-extended'

import { describe, expect, it } from '@jest/globals'
import { toMatchImageSnapshot } from 'jest-image-snapshot'
import sharp from 'sharp'
import { ACESFilmicToneMapping, LinearToneMapping } from 'three'

import { getPage } from './common'

expect.extend({ toMatchImageSnapshot })

const matrix: [string, number][] = [
  ['memorial.exr', ACESFilmicToneMapping],
  ['memorial.hdr', ACESFilmicToneMapping],
  ['memorial.exr', LinearToneMapping],
  ['memorial.hdr', LinearToneMapping],
  ['chcaus2-bloom.exr', ACESFilmicToneMapping],
  ['chcaus2-bloom.hdr', ACESFilmicToneMapping],
  ['chcaus2-bloom.exr', LinearToneMapping],
  ['chcaus2-bloom.hdr', LinearToneMapping],
  ['spruit_sunrise_1k.hdr', LinearToneMapping],
  ['spruit_sunrise_1k.hdr', ACESFilmicToneMapping]
]

describe('encode', () => {
  it.each(matrix)('encodes %p using tonemapping %p', async (file, toneMapping) => {
    // we need to launch puppeteer with a
    // custom written "testbed.html" page
    // because our encoder works by
    // rendering the SDR image with THREEjs
    // which only works in webgl (not here in node where we test)
    const { page, pageError, pageLog } = await getPage('encode')

    // we receive Arrays because puppeteer can't transfer Uint8Array data
    const result = await page.evaluate(`
        encode(
          '${file}',
          ${toneMapping}
      )`) as { sdr: { width: number, height: number, data: Uint8Array }, gainMap: { width: number, height: number, data: Uint8Array } }

    // we receive Arrays because puppeteer can't transfer Uint8Array data
    result.gainMap.data = Uint8Array.from(result.gainMap.data)
    result.sdr.data = Uint8Array.from(result.sdr.data)

    expect(pageError).not.toBeCalled()
    // expect no calls to page log except the one indicated
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    expect(pageLog).not.toBeCalledWith(expect.not.stringMatching(/GPU stall due to ReadPixels/))

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

    expect(await sharp(result.sdr.data, {
      raw: {
        width: result.sdr.width,
        height: result.sdr.height,
        channels: 4
      }
    }).png().toBuffer()).toMatchImageSnapshot({
      comparisonMethod: 'ssim',
      failureThreshold: 0.015, // 1.5% difference
      failureThresholdType: 'percent'
    })

    expect(await sharp(result.gainMap.data, {
      raw: {
        width: result.gainMap.width,
        height: result.gainMap.height,
        channels: 4
      }
    }).png().toBuffer()).toMatchImageSnapshot({
      comparisonMethod: 'ssim',
      failureThreshold: 0.015, // 1.5% difference
      failureThresholdType: 'percent'
    })
  }, 900000 /* 15 minutes */)
})
