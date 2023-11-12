/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  projects: [{
    displayName: 'e2e',
    testMatch: ['<rootDir>/tests/e2e/**/*.test.ts'],
    preset: 'ts-jest/presets/js-with-ts',
    setupFilesAfterEnv: ['jest-extended/all'],
    transformIgnorePatterns: ['node_modules/(?!(three|image-info-extractor))'],
    transform: { '^.+\\.[tj]s[xm]?$': ['ts-jest', { tsconfig: 'tests/tsconfig.json' }] }
  }, {
    displayName: 'jsdom',
    testMatch: ['<rootDir>/tests/jsdom/**/*.test.ts'],
    testEnvironment: 'jsdom',
    preset: 'ts-jest/presets/js-with-ts',
    setupFilesAfterEnv: ['jest-extended/all'],
    transformIgnorePatterns: ['node_modules/(?!(three|image-info-extractor))'],
    transform: { '^.+\\.[tj]s[xm]?$': ['ts-jest', { tsconfig: 'tests/tsconfig.json' }] }
  }]
}
