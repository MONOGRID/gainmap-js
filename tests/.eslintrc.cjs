/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
  root: true,

  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname
  },
  env: {
    node: true,
    browser: true,
    es2021: true
  },

  // Rules order is important, please avoid shuffling them
  extends: [
    // https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin#usage
    // ESLint typescript rules
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'standard'
  ],

  plugins: [
    // required to apply rules which need type information
    '@typescript-eslint',
    'simple-import-sort', // https://github.com/lydell/eslint-plugin-simple-import-sort/
    'unused-imports' // https://github.com/sweepline/eslint-plugin-unused-imports
  ],

  // add your custom rules here
  rules: {
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: false
      }
    ],
    '@typescript-eslint/no-duplicate-type-constituents': 'off',
    // https://github.com/lydell/eslint-plugin-simple-import-sort/#usage
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    // https://github.com/sweepline/eslint-plugin-unused-imports
    '@typescript-eslint/no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': ['error', { vars: 'all', args: 'none' }]
  }
}
