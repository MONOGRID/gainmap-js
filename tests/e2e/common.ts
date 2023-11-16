import { expect, jest } from '@jest/globals'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { ConsoleMessage } from 'puppeteer'

export const getPage = async (pageName: string) => {
  const pageError = jest.fn((e: string) => {
    console.error(e)
  })

  const pageLog = jest.fn((e: string) => {
    console.log(e)
  })

  const page = await globalThis.browser.newPage()
  page.on('console', (e: ConsoleMessage) => {
    pageLog(`PAGE MESSAGE: ${e.text()}\nSTACKTRACE:\n ${e.stackTrace().map(e => `at ${e.url}${e.lineNumber ? ':' + e.lineNumber : ''}:${e.columnNumber ? ':' + e.columnNumber : ''}`).join('\n')}`)
  })
  page.on('pageerror', (e: Error) => {
    pageError(`${e.name}: ${e.message}\nSTACKTRACE:\n ${e.stack}`)
  })

  page.setRequestInterception(true)
  page.on('request', async (request) => {
    const splt = request.url().split('https://local/')
    if (splt.length > 1) {
      const file = await readFile(join(__dirname, `../fixtures/${splt[1]}`))
      request.respond({
        status: 200,
        contentType: 'binary/octet-stream',
        body: file
      })
      return
    }
    request.continue()
  })

  const response = await page.goto(`file://${join(__dirname, `./pages/${pageName}.html`)}`, { timeout: 0 })
  expect(response).not.toBeNull()
  expect(response?.status()).toBe(200)

  return {
    page,
    pageError,
    pageLog
  }
}
