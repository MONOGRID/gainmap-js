/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname
  },
  env: {
    browser: true,
    es2018: true
  },

  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:compat/recommended',
    'standard'
  ],

  plugins: [
    '@typescript-eslint',
    'simple-import-sort',
    'unused-imports'
  ],

  rules: {
    "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
    "@typescript-eslint/no-duplicate-type-constituents": "off",
    // https://github.com/lydell/eslint-plugin-simple-import-sort/#usage
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    // https://github.com/sweepline/eslint-plugin-unused-imports
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': ['warn', { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' }]
  }
}
