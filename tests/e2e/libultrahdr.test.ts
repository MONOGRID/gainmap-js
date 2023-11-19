import { describe, expect, it } from '@jest/globals'
import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

import { type UltraHDRUnpacked } from '../../libultrahdr-wasm/build/libultrahdr'
import { getPage } from './common'

describe('libultrahdr', () => {
  it('wasm appends an encoding result to a jpeg', async () => {
    const { page, pageError } = await getPage('base')

    await page.addScriptTag({
      type: 'module',
      url: 'scripts/encode-jpeg-metadata.js'
    })

    const result = await page.evaluate(`
        encodeJPEGMetadata('memorial.exr')
      `) as Awaited<number[]>

    expect(pageError).not.toBeCalled()
    // expect(pageLog).not.toBeCalled()

    const jpeg = Uint8Array.from(result)

    if (!existsSync(path.join(__dirname, './results'))) {
      await mkdir(path.join(__dirname, './results/'))
    }
    await writeFile(path.join(__dirname, './results/result-embedded.jpg'), Buffer.from(jpeg))
  }, 100000)

  it('extracts metadata', async () => {
    const { page, pageError, pageLog } = await getPage('base')

    await page.addScriptTag({
      type: 'module',
      url: 'scripts/decode-jpeg-metadata.js'
    })

    const result = await page.evaluate('decodeJPEGMetadata(\'memorial.jpg\')') as UltraHDRUnpacked

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    result.gainMap = Uint8Array.from(result.gainMap)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    result.sdr = Uint8Array.from(result.sdr)

    expect(pageError).not.toBeCalled()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    expect(pageLog).not.toBeCalledWith(expect.not.stringMatching(/GPU stall due to ReadPixels/))
    // console.log(result)
    // const file = await readFile(join(__dirname, './fixtures/memorial.jpg'))

    // const meta = await decodeJPEGMetadata(file)
    // console.log(meta)
  }, 900000 /* 15 minutes */)
})
