import { describe, expect, it } from '@jest/globals'
import { readFile } from 'fs/promises'
import { toMatchImageSnapshot } from 'jest-image-snapshot'
import path from 'path'
import sharp from 'sharp'

import { MPFExtractor } from '../../src/decode/utils/MPFExtractor'

expect.extend({ toMatchImageSnapshot })

const blobToArrayBuffer = (r: Blob) => {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = (e) => {
      if (fr.result instanceof ArrayBuffer) {
        resolve(fr.result)
      }
    }
    fr.onerror = reject
    fr.readAsArrayBuffer(r)
  })
}

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
  // ['abandoned_bakery_16k.jpg'] // too bit to test? snapshot testing fails
]

describe('MPFExtractor', () => {
  it.each(matrix)('finds the gainmap in %p', async (fileName) => {
    const file = await readFile(path.join(__dirname, `../fixtures/${fileName}`))

    const extractor = new MPFExtractor({ extractFII: true, extractNonFII: true })
    const result = await extractor.extract(new Uint8Array(file.buffer))

    expect(result).not.toBeUndefined()
    expect(result).toBeArrayOfSize(2)

    const sdr = await blobToArrayBuffer(result[0])
    expect(await sharp(sdr).png().toBuffer()).toMatchImageSnapshot({
      comparisonMethod: 'ssim',
      failureThreshold: 0.015, // 1.5% difference
      failureThresholdType: 'percent'
    })

    const gainMap = await blobToArrayBuffer(result[1])
    expect(await sharp(gainMap).png().toBuffer()).toMatchImageSnapshot({
      comparisonMethod: 'ssim',
      failureThreshold: 0.015, // 1.5% difference
      failureThresholdType: 'percent'
    })
  }, 900000 /* 15 minutes */)
})
