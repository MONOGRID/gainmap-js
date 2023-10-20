import { afterAll, beforeAll, expect, jest } from '@jest/globals'
import { readFile } from 'fs/promises'
import { join } from 'path'
import puppeteer, { ConsoleMessage } from 'puppeteer'

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

export const getTestbed = async () => {
  const pageError = jest.fn((e: Error) => {
    console.error(e.name, ':', e.message, '\nSTACKTRACE:\n', e.stack)
  })

  const pageLog = jest.fn((e: ConsoleMessage) => {
    console.log('PAGE MESSAGE:', e.text(), '\nSTACKTRACE:\n', e.stackTrace().map(e => `at ${e.url}:${e.lineNumber}:${e.columnNumber}`).join('\n'))
  })

  const page = await globalThis.browser.newPage()
  page.on('console', pageLog)
  page.on('pageerror', pageError)

  page.setRequestInterception(true)
  page.on('request', async (request) => {
    const splt = request.url().split('https://local/')
    if (splt.length > 1) {
      const file = await readFile(join(__dirname, `./fixtures/${splt[1]}`))
      request.respond({
        status: 200,
        contentType: 'binary/octet-stream',
        body: file
      })
      return
    }
    request.continue()
  })

  const response = await page.goto(`file://${join(__dirname, './testbed.html')}`, { timeout: 0 })
  expect(response).not.toBeNull()
  expect(response?.status()).toBe(200)

  return {
    page,
    pageError,
    pageLog
  }
}
