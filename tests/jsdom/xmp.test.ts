import { describe, expect, it } from '@jest/globals'
import { readFile } from 'fs/promises'
import path from 'path'

import { extractXMP } from '../../src/decode/utils/extract-metadata-from-jpeg'

describe('xmp', () => {
  it.each([
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
    const results = extractXMP(file)
    expect(results).not.toBeUndefined()
    expect(results).toMatchSnapshot()
  })
})
