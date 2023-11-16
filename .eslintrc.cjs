module.exports = {
  // https://eslint.org/docs/user-guide/configuring#configuration-cascading-and-hierarchy
  // This option interrupts the configuration hierarchy at this file
  // Remove this if you have an higher level ESLint config file (it usually happens into a monorepos)
  root: true,

  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
    extraFileExtensions: ['.html']
  },
  env: {
    browser: true,
    es2021: true,
    node: true
  },

  // Rules order is important, please avoid shuffling them
  extends: [
    // Base ESLint recommended rules
    // 'eslint:recommended',

    // https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin#usage
    // ESLint typescript rules
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'standard'

  ],

  plugins: [
    // required to apply rules which need type information
    '@typescript-eslint',
    // 'html', // TODO: enable this to check examples, but with less rules :)
    'jest-extended',
    'simple-import-sort', // https://github.com/lydell/eslint-plugin-simple-import-sort/
    'unused-imports' // https://github.com/sweepline/eslint-plugin-unused-imports

  ],

  globals: {
    ga: 'readonly', // Google Analytics
    cordova: 'readonly',
    __statics: 'readonly',
    __QUASAR_SSR__: 'readonly',
    __QUASAR_SSR_SERVER__: 'readonly',
    __QUASAR_SSR_CLIENT__: 'readonly',
    __QUASAR_SSR_PWA__: 'readonly',
    process: 'readonly',
    Capacitor: 'readonly',
    chrome: 'readonly',
    electron: 'readonly'
  },

  // add your custom rules here
  rules: {
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        "checksVoidReturn": false
      }
    ],
    "@typescript-eslint/no-duplicate-type-constituents": "off",
    // https://github.com/lydell/eslint-plugin-simple-import-sort/#usage
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    // https://github.com/sweepline/eslint-plugin-unused-imports
    '@typescript-eslint/no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': ['error', { vars: 'all', args: 'none' }],

    // allow async-await
    'generator-star-spacing': 'off',
    // allow paren-less arrow functions
    'arrow-parens': 'off',
    'one-var': 'off',
    'no-void': 'off',
    'multiline-ternary': 'off',

    'import/first': 'off',
    'import/namespace': 'off',
    'import/default': 'error',
    'import/export': 'error',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'import/no-extraneous-dependencies': 'off',

    // The core 'import/named' rules
    // does not work with type definitions
    'import/named': 'off',

    'prefer-promise-reject-errors': 'off',

    quotes: ['warn', 'single', { avoidEscape: true }],

    // this rule, if on, would require explicit return type on the `render` function
    '@typescript-eslint/explicit-function-return-type': 'off',

    // in plain CommonJS modules, you can't use `import foo = require('foo')` to pass this rule, so it has to be disabled
    '@typescript-eslint/no-var-requires': 'off',

    // The core 'no-unused-vars' rules (in the eslint:recommended ruleset)
    // does not work with type definitions
    'no-unused-vars': 'off',

    // allow debugger during development only
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off'
  }
}
