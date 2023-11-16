import { afterAll, beforeAll } from '@jest/globals'
import puppeteer from 'puppeteer'

beforeAll(async () => {
  globalThis.browser = await puppeteer.launch({
    args: [
      '--disable-web-security',
      '--enable-gpu',
      '--use-gl=angle',
      '--enable-webgl'
    ],
    headless: true
  })
})

afterAll(async () => {
  await globalThis.browser.close()
})
