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

describe('MPFExtractor', () => {
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

  ])('finds the gainmap in $fileName', async ({ fileName }) => {
    const file = await readFile(path.join(__dirname, `../fixtures/${fileName}`))

    const extractor = new MPFExtractor({ extractFII: true, extractNonFII: true })
    const result = await extractor.extract(new Uint8Array(file.buffer))

    expect(result).not.toBeUndefined()
    expect(result).toBeArrayOfSize(2)

    const sdr = await blobToArrayBuffer(result[0])
    expect(await sharp(sdr).png().toBuffer()).toMatchImageSnapshot({
      failureThreshold: 0.01,
      failureThresholdType: 'percent'
    })

    const gainMap = await blobToArrayBuffer(result[1])
    expect(await sharp(gainMap).png().toBuffer()).toMatchImageSnapshot({
      failureThreshold: 0.01,
      failureThresholdType: 'percent'
    })
  }, 900000 /* 15 minutes */)
})
