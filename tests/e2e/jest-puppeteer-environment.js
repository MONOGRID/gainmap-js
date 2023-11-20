// @ts-check
import fs from 'fs'
import { TestEnvironment } from 'jest-environment-node'
import os from 'os'
import path from 'path'
import puppeteer from 'puppeteer'

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup')

export default class PuppeteerEnvironment extends TestEnvironment {
  async setup () {
    await super.setup()
    const wsEndpoint = fs.readFileSync(path.join(DIR, 'wsEndpoint'), 'utf8')
    if (!wsEndpoint) {
      throw new Error('wsEndpoint not found')
    }
    this.global.browser = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint
    })
  }
}
