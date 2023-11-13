import { describe, expect, it } from '@jest/globals'
import { existsSync } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { performance } from 'perf_hooks'

import { MPFExtractor } from '../../src/decode/utils/MPFExtractor'

const blobToArrayBuffer = (r: Blob) => {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = async (e) => {
      if (fr.result instanceof ArrayBuffer) {
        resolve(fr.result)
      }
    }
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

    performance.mark(`${fileName} mpf extract start`)
    const extractor = new MPFExtractor({ extractFII: true, extractNonFII: true })
    const result = await extractor.extract(new Uint8Array(file.buffer))
    performance.mark(`${fileName} mpf extract end`)

    const measure = performance.measure(`${fileName} mpf extraction`, `${fileName} mpf extract start`, `${fileName} mpf extract end`)
    console.log(measure.name, measure.duration, 'ms')

    expect(result).not.toBeUndefined()
    expect(result).toBeArrayOfSize(2)

    if (!existsSync(path.join(__dirname, './results'))) {
      await mkdir(path.join(__dirname, './results/'))
    }

    for (let i = 0; i < result.length; i++) {
      const r = await blobToArrayBuffer(result[i])
      await writeFile(path.join(__dirname, `./results/${fileName}-mpf-extracted.image-${i}.jpg`), Buffer.from(r))
    }
  })
})
