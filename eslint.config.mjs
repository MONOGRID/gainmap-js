import { FlatCompat } from '@eslint/eslintrc'
import { defineConfig } from 'eslint/config'
// @ts-expect-error untyped lib
import mdcs from 'eslint-config-mdcs'
// @ts-expect-error untyped lib
import htmlPlugin from 'eslint-plugin-html'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'
import neoStandard, { plugins } from 'neostandard'
import path from 'path'
import { fileURLToPath } from 'url'

// HTML examples need a config of their own
const mdcsCompat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url))
}).config(mdcs)

const integratedExamplesPath = 'examples/integrated/*.html'

// Get the neostandard configs
const neoStandardConfigs = neoStandard({ ts: true })
// Get TypeScript recommended type checking configs
const typeCheckingConfigs = plugins['typescript-eslint'].configs['recommendedTypeChecked']

const config = defineConfig([
  // Common ignores for all configs
  {
    ignores: [
      'node_modules/**/*',
      'dist/**/*',
      '.vscode/**/*',
      'libultrahdr-wasm/build/**/*'
    ]
  }
])

// Add mdcs configs for html files in examples
for (const mdcsConfig of mdcsCompat) {
  config.push({
    ...mdcsConfig,
    files: [integratedExamplesPath],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        extraFileExtensions: ['.html'],
      }
    },
    plugins: {
      html: htmlPlugin
    }
  })
}

// Add neostandard configs with proper file patterns
for (const neoConfig of neoStandardConfigs) {
  config.push({
    ...neoConfig,
    files: ['**/*.{ts,mts,cts,tsx,js,mjs,cjs}'],
    ignores: [
      ...(neoConfig.ignores || []),
      integratedExamplesPath
    ]
  })
}

// Add TypeScript type checking configs
if (Array.isArray(typeCheckingConfigs)) {
  for (const tsConfig of typeCheckingConfigs) {
    // @ts-expect-error untyped lib
    config.push({
      ...tsConfig,
      files: ['**/*.{ts,mts,cts,tsx}'],
      ignores: [
        ...(tsConfig.ignores || []),
        integratedExamplesPath
      ]
    })
  }
} else {
  config.push({
    // @ts-expect-error untyped lib
    ...typeCheckingConfigs,
    files: ['**/*.{ts,mts,cts,tsx}'],
    ignores: [
      // @ts-expect-error untyped lib
      ...(typeCheckingConfigs.ignores || []),
      integratedExamplesPath
    ]
  })
}

// Add our custom settings
config.push({
  name: 'app/settings',
  files: ['**/*.{ts,mts,cts,tsx,js,mjs,cjs}'],
  ignores: [integratedExamplesPath],
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  plugins: {
    'simple-import-sort': simpleImportSort,
    'unused-imports': unusedImports
  },
  rules: {
    // https://github.com/lydell/eslint-plugin-simple-import-sort/#usage
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    'sort-imports': 'off',
    'import/order': 'off',

    // https://github.com/sweepline/eslint-plugin-unused-imports
    '@typescript-eslint/no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': ['error', { vars: 'all', args: 'none', caughtErrors: 'none' }],

    '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
  },
})

export default config
