// @ts-check
import os from 'os'
import path from 'path'
import { rimraf } from 'rimraf'

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup')

export default async function () {
  await global.__BROWSER_GLOBAL__.close()
  rimraf.sync(DIR)
}
