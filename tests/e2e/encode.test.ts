import 'jest-extended'

import { describe, expect, it } from '@jest/globals'
import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { ACESFilmicToneMapping, LinearToneMapping } from 'three'

import { encodeAndCompress } from '../../src/encode'
import { getTestbed } from './common'

describe('encoder', () => {
  it.concurrent.each([
    { file: 'memorial.exr', format: 'jpg', quality: 0.7, tonemapping: ACESFilmicToneMapping },
    { file: 'memorial.exr', format: 'webp', quality: 0.7, tonemapping: ACESFilmicToneMapping },
    { file: 'memorial.exr', format: 'png', quality: 0.7, tonemapping: ACESFilmicToneMapping },

    { file: 'memorial.hdr', format: 'jpg', quality: 0.7, tonemapping: ACESFilmicToneMapping },
    { file: 'memorial.hdr', format: 'webp', quality: 0.7, tonemapping: ACESFilmicToneMapping },
    { file: 'memorial.hdr', format: 'png', quality: 0.7, tonemapping: ACESFilmicToneMapping },

    { file: 'memorial.exr', format: 'jpg', quality: 0.7, tonemapping: LinearToneMapping },
    { file: 'memorial.exr', format: 'webp', quality: 0.7, tonemapping: LinearToneMapping },
    { file: 'memorial.exr', format: 'png', quality: 0.7, tonemapping: LinearToneMapping },

    { file: 'memorial.hdr', format: 'jpg', quality: 0.7, tonemapping: LinearToneMapping },
    { file: 'memorial.hdr', format: 'webp', quality: 0.7, tonemapping: LinearToneMapping },
    { file: 'memorial.hdr', format: 'png', quality: 0.7, tonemapping: LinearToneMapping }
  ])('encodes $file to $format using quality $quality, tonemapping: $tonemapping', async ({ file, format, quality, tonemapping }) => {
    // we need to launch puppeteer with a
    // custom written "testbed.html" page
    // because our encoder works by
    // rendering the SDR image with THREEjs
    // which only works in webgl (not here in node where we test)
    const { page, pageError, pageLog } = await getTestbed()

    const result = await page.evaluate(`
      encodeAndCompress(
        '${file}',
        'image/${format === 'jpg' ? 'jpeg' : format}',
        ${quality},
        ${tonemapping}
    )`) as Awaited<ReturnType<typeof encodeAndCompress>> & { textureMax: [number, number, number] }

    expect(pageError).not.toBeCalled()
    // expect no calls to page log except the one indicated
    expect(pageLog).not.toBeCalledWith(expect.not.stringMatching(/GPU stall due to ReadPixels/))

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
    expect(result.gainMap.width).not.toBe(0)

    expect(result.gainMap.height).toBeNumber()
    expect(result.gainMap.height).not.toBe(0)

    expect(result.sdr).toBeObject()
    expect(result.sdr.data).toBeInstanceOf(Uint8Array)
    expect(result.sdr.data.length).toBeGreaterThan(4)

    expect(result.sdr.width).toBeNumber()
    expect(result.sdr.width).not.toBe(0)

    expect(result.sdr.height).toBeNumber()
    expect(result.sdr.height).not.toBe(0)

    if (!existsSync(path.join(__dirname, './results'))) {
      await mkdir(path.join(__dirname, './results/'))
    }
    await writeFile(path.join(__dirname, `./results/${file}-q${quality}-t${tonemapping}-output.${format}`), Buffer.from(result.sdr.data))
    await writeFile(path.join(__dirname, `./results/${file}-q${quality}-t${tonemapping}-gainmap.${format}`), Buffer.from(result.gainMap.data))
    await writeFile(path.join(__dirname, `./results/${file}-q${quality}-t${tonemapping}-${format}.json`), Buffer.from(
      JSON.stringify({
        offsetSdr: result.offsetSdr,
        offsetHdr: result.offsetHdr,
        gamma: result.gamma,
        hdrCapacityMin: result.hdrCapacityMin,
        hdrCapacityMax: result.hdrCapacityMax,
        gainMapMin: result.gainMapMin,
        gainMapMax: result.gainMapMax
      }, null, 2)
    ))
  }, 100000)
})
