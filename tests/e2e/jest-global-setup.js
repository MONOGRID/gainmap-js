// @ts-check
import fs from 'fs'
import { mkdirp } from 'mkdirp'
import os from 'os'
import path from 'path'
import puppeteer from 'puppeteer'

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup')

export default async function () {
  const browser = await puppeteer.launch({
    args: [
      '--disable-web-security',
      '--enable-gpu',
      '--use-gl=angle',
      '--enable-webgl'
    ],
    headless: true
  })
  // This global is not available inside tests but only in global teardown
  global.__BROWSER_GLOBAL__ = browser
  // Instead, we expose the connection details via file system to be used in tests
  mkdirp.sync(DIR)
  fs.writeFileSync(path.join(DIR, 'wsEndpoint'), browser.wsEndpoint())
}
