import 'jest-extended'

import { describe, expect, it } from '@jest/globals'
import { toMatchImageSnapshot } from 'jest-image-snapshot'

import { getPage } from './common'

expect.extend({ toMatchImageSnapshot })

const matrix = [
  ['memorial.exr'],
  ['memorial.hdr'],
  ['chcaus2-bloom.exr'],
  ['chcaus2-bloom.hdr'],
  ['spruit_sunrise_1k.hdr']
]

describe('find-texture-min-max', () => {
  it.each(matrix)('finds min and max in %p', async (file) => {
    const { page, pageError, pageLog } = await getPage('base')

    await page.addScriptTag({
      type: 'module',
      url: 'scripts/find-texture-min-max.js'
    })

    // we receive Arrays because puppeteer can't transfer Uint8Array data
    const result = await page.evaluate(`findTextureMinMax('${file}')`) as { min: number, max: number }

    expect(pageError).not.toBeCalled()
    // expect no calls to page log except the one indicated
    expect(pageLog).not.toBeCalledWith(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      expect.not.stringMatching(/GPU stall due to ReadPixels/)
    )

    expect(result).toMatchSnapshot('min & max')
  }, 900000 /* 15 minutes */)
})
