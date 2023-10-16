import { expect, test } from '@jest/globals'

import { getTestbed } from './common'

test('encodes', async () => {
  const page = await getTestbed()

  const result = await page.evaluate('encode()')

  expect(result).toMatchObject({
    sdr: { width: 512, height: 512, data: new Uint8Array() },
    gainMap: { width: 512, height: 512, data: new Uint8Array() }
    // fullDisplayBoost: [number, number, number];
    // gainMapMin: [number, number, number];
    // gainMapMax: [number, number, number];
    // mapGamma: number;
    // offsetHdr: number;
    // offsetSdr: number;
    // hdrCapacityMin: [...];
    // hdrCapacityMax: [...];
  })

  // if (result && typeof result === 'object' && 'gainMap' in result) {
  //   console.log(result.gainMap)
  // }
})
