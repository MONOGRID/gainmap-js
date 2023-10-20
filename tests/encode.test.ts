import 'jest-extended'

import { describe, expect, it } from '@jest/globals'
import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { ACESFilmicToneMapping, NoToneMapping } from 'three'

import { EncodeRawResult } from '../src'
import { getTestbed } from './common'

describe('encoder', () => {
  it.concurrent.each([
    { file: 'memorial.exr', format: 'jpg', quality: 0.7, tonemapping: ACESFilmicToneMapping },
    { file: 'memorial.exr', format: 'webp', quality: 0.7, tonemapping: ACESFilmicToneMapping },
    { file: 'memorial.exr', format: 'png', quality: 0.7, tonemapping: ACESFilmicToneMapping },

    { file: 'memorial.hdr', format: 'jpg', quality: 0.7, tonemapping: ACESFilmicToneMapping },
    { file: 'memorial.hdr', format: 'webp', quality: 0.7, tonemapping: ACESFilmicToneMapping },
    { file: 'memorial.hdr', format: 'png', quality: 0.7, tonemapping: ACESFilmicToneMapping },

    { file: 'memorial.exr', format: 'jpg', quality: 0.7, tonemapping: NoToneMapping },
    { file: 'memorial.exr', format: 'webp', quality: 0.7, tonemapping: NoToneMapping },
    { file: 'memorial.exr', format: 'png', quality: 0.7, tonemapping: NoToneMapping },

    { file: 'memorial.hdr', format: 'jpg', quality: 0.7, tonemapping: NoToneMapping },
    { file: 'memorial.hdr', format: 'webp', quality: 0.7, tonemapping: NoToneMapping },
    { file: 'memorial.hdr', format: 'png', quality: 0.7, tonemapping: NoToneMapping }
  ])('encodes $file to $format using quality $quality, tonemapping: $tonemapping', async ({ file, format, quality, tonemapping }) => {
    // we need to launch puppetteer with a
    // custom written "testbed.html" page
    // because our encoder works by
    // rendering the SDR image with THREEjs
    // which only works in webgl (not here in node where we test)
    const { page, pageError, pageLog } = await getTestbed()

    const result = await page.evaluate(`
      encode(
        '${file}',
        'image/${format === 'jpg' ? 'jpeg' : format}',
        ${quality},
        ${tonemapping}
    )`) as Awaited<EncodeRawResult>

    expect(pageError).not.toBeCalled()
    expect(pageLog).not.toBeCalled()

    // we receive Arrays because puppetteer can't transfer Uint8Array data
    result.gainMap.data = Uint8Array.from(result.gainMap.data)
    result.sdr.data = Uint8Array.from(result.sdr.data)

    expect(result.gainMapMin).toBeArrayOfSize(3)
    expect(result.gainMapMax).toBeArrayOfSize(3)
    expect(result.hdrCapacityMin).toBeArrayOfSize(3)
    expect(result.hdrCapacityMax).toBeArrayOfSize(3)

    expect(result.mapGamma).toBeNumber()
    expect(result.offsetHdr).toBeNumber()
    expect(result.offsetSdr).toBeNumber()

    expect(result.gainMap).toBeObject()
    expect(result.gainMap.data).toBeInstanceOf(Uint8Array)
    expect(result.gainMap.width).toBeNumber()
    expect(result.gainMap.height).toBeNumber()

    expect(result.sdr).toBeObject()
    expect(result.sdr.data).toBeInstanceOf(Uint8Array)
    expect(result.sdr.width).toBeNumber()
    expect(result.sdr.height).toBeNumber()

    if (!existsSync(path.join(__dirname, './results'))) {
      await mkdir(path.join(__dirname, './results/'))
    }
    await writeFile(path.join(__dirname, `./results/${file}-q${quality}-t${tonemapping}-output.${format}`), Buffer.from(result.sdr.data))
    await writeFile(path.join(__dirname, `./results/${file}-q${quality}-t${tonemapping}-gainmap.${format}`), Buffer.from(result.gainMap.data))
    await writeFile(path.join(__dirname, `./results/${file}-q${quality}-t${tonemapping}-${format}.json`), Buffer.from(
      JSON.stringify({
        offsetSdr: result.offsetSdr,
        offsetHdr: result.offsetHdr,
        mapGamma: result.mapGamma,
        hdrCapacityMin: result.hdrCapacityMin,
        hdrCapacityMax: result.hdrCapacityMax,
        gainMapMin: result.gainMapMin,
        gainMapMax: result.gainMapMax
      }, null, 2)
    ))
  }, 50000)
})
