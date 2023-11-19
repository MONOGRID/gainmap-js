import 'jest-extended'

import { describe, expect, it } from '@jest/globals'
import { toMatchImageSnapshot } from 'jest-image-snapshot'

import { getPage } from './common'

expect.extend({ toMatchImageSnapshot })

const matrix = [
  ['01.jpg'],
  ['02.jpg'],
  ['03.jpg'],
  ['04.jpg'],
  ['05.jpg'],
  ['06.jpg'],
  ['07.jpg'],
  ['08.jpg'],
  ['09.jpg'],
  ['10.jpg'],
  ['pisa-4k.jpg'],
  ['spruit_sunrise_4k.jpg']
  // ['abandoned_bakery_16k.jpg'] // too big to test? snapshot testing fails
]

describe('JPEGRLoader', () => {
  it.each(matrix)('reconstructs an HDR image from %p', async (file) => {
    const { page, pageError, pageLog } = await getPage('base')
    await page.addScriptTag({
      type: 'module',
      url: 'scripts/jpegrloader.js'
    })
    const result = await page.evaluate(`JPEGRLoader('${file}')`) as { width: number, height: number, data: Uint16Array, max: number }

    expect(pageError).not.toBeCalled()
    // expect no calls to page log except the one indicated
    expect(pageLog).not.toBeCalledWith(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      expect.not.stringMatching(/GPU stall due to ReadPixels/)
    )

    // we receive Arrays because puppeteer can't transfer Uint8Array data
    result.data = Uint16Array.from(result.data)

    expect(result.data).toBeInstanceOf(Uint16Array)
    expect(result.data.length).toBeGreaterThan(4)
    expect(result.max).toMatchSnapshot('max HDR value')
  }, 900000 /* 15 minutes */)
})
