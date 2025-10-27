export declare global {
  interface Window {
    collectIstanbulCoverage: (coverageJSON: string) => void
    __coverage__: Record<string, unknown>
  }
}
