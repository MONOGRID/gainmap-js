export declare global {
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface Window {
    collectIstanbulCoverage: (coverageJSON: string) => void
    __coverage__: Record<string, unknown>
  }
}
