/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-var */

import * as jestExtendedMatchers from 'jest-extended'
import { MatchImageSnapshotOptions } from 'jest-image-snapshot'

declare module 'expect' {
  type JestExtendedMatchers = typeof jestExtendedMatchers;

  interface JestImageSnapShotMatchers<R = any> extends JestExtendedMatchers {
    toMatchImageSnapshot(options?: MatchImageSnapshotOptions): R;
  }
  export interface AsymmetricMatchers extends JestImageSnapShotMatchers { }

  // eslint-disable-next-line unused-imports/no-unused-vars
  export interface Matchers<R> extends JestImageSnapShotMatchers<R> { }
}
