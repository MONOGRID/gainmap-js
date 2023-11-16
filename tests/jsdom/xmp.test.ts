import { describe, expect, it } from '@jest/globals'
import { readFile } from 'fs/promises'
import path from 'path'

import { extractXMP } from '../../src/decode/utils/extract-metadata-from-jpeg'

describe('xmp', () => {
  it.concurrent.each([
    { fileName: '01.jpg' },
    { fileName: '02.jpg' },
    { fileName: '03.jpg' },
    { fileName: '04.jpg' },
    { fileName: '05.jpg' },
    { fileName: '06.jpg' },
    { fileName: '07.jpg' },
    { fileName: '08.jpg' },
    { fileName: '09.jpg' },
    { fileName: '10.jpg' },
    { fileName: 'pisa-4k.jpg' },
    { fileName: 'spruit_sunrise_4k.jpg' },
    { fileName: 'abandoned_bakery_16k.jpg' }

  ])('finds hdr xmp data in $fileName', async ({ fileName }) => {
    const file = await readFile(path.join(__dirname, `../fixtures/${fileName}`))
    // performance.mark(`${fileName} xmp extract start`)
    const results = extractXMP(file)
    // performance.mark(`${fileName} xmp extract end`)
    // const measure = performance.measure(`${fileName} xmp extraction`, `${fileName} xmp extract start`, `${fileName} xmp extract end`)
    // console.log(measure.name, measure.duration, 'ms')
    expect(results).not.toBeUndefined()
    expect(results).toMatchSnapshot()
  })
})
