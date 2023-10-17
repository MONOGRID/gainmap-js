/* eslint-disable no-var */

import * as matchers from 'jest-extended'
import { Browser } from 'puppeteer'

declare global {
  var browser: Browser
}

declare module 'expect' {
    type JestExtendedMatchers = typeof matchers;

    export interface AsymmetricMatchers extends JestExtendedMatchers {}

    // eslint-disable-next-line unused-imports/no-unused-vars
    export interface Matchers<R> extends JestExtendedMatchers {}
}
