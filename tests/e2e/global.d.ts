/* eslint-disable no-var */

import { Browser } from 'puppeteer'

declare global {
  var browser: Browser
  var __BROWSER_GLOBAL__: Browser
}
