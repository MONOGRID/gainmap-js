/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/js-with-ts',
  setupFilesAfterEnv: ['jest-extended/all'],
  // moduleNameMapper: {
  //   '^(\\.{1,2}/.*)\\.js$': '$1'
  // },
  transformIgnorePatterns: [
    'node_modules/(?!(three|image-info-extractor))'
  ],
  transform: {
    '^.+\\.[tj]s[xm]?$': ['ts-jest', { tsconfig: 'tests/tsconfig.json' }]
  }
}
