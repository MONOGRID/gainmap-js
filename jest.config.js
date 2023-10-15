/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/js-with-ts',
  setupFilesAfterEnv: ['jest-extended/all'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transformIgnorePatterns: ['node_modules/(?!(three))'],
  transform: {
    // '^.+\\.jsx?$': 'babel-jest', // Adding this line solved the issue
    '^.+\\.[tj]sx?$': 'ts-jest' // to process js/ts with `ts-jest`
    // '^.+\\.tsx?$': 'ts-jest'
  }
}
