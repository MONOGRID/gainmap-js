/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-var */

export declare global {
  interface Window {
    collectIstanbulCoverage: (coverageJSON: string) => void
    __coverage__: Record<string, unknown>
  }
}
