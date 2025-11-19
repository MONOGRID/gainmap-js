import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'
import del from 'rollup-plugin-delete'
// @ts-expect-error untyped library
import istanbul from 'rollup-plugin-istanbul'
import license from 'rollup-plugin-license'

import pkgJSON from './package.json' with { type: 'json' }

const { author, name, version } = pkgJSON

/** @type {import('rollup').OutputOptions} */
const settings = {
  globals: {
    three: 'three'
  },
  sourcemap: !!process.env.PLAYWRIGHT_TESTING
}

const configBase = defineConfig({
  external: ['three']
})

/** @type {import('rollup').InputPluginOption[]} */
const plugins = [
  json(),
  typescript({
    tsconfig: 'src/tsconfig.json',
    declaration: true,
    sourceMap: !!process.env.PLAYWRIGHT_TESTING,
    declarationDir: 'dist',
    include: ['src/**/*.ts'],
    exclude: ['src/libultrahdr.ts', 'src/libultrahdr/**/*.ts', 'src/encode.ts', 'src/encode/**/*.ts', 'src/worker*.ts']
  }),
  resolve(),
  commonjs({
    include: 'node_modules/**',
    extensions: ['.js'],
    ignoreGlobal: false,
    sourceMap: !!process.env.PLAYWRIGHT_TESTING
  }),
  license({
    banner: `
        ${name} v${version}
        With ❤️, by ${author}
      `
  })
]

if (process.env.PLAYWRIGHT_TESTING) {
  plugins.push(
    istanbul({
      include: ['src/**/*.ts']

    })
  )
}

/** @type {import('rollup').InputPluginOption[]} */
const pluginsMinified = [
  ...plugins,
  terser({
    format: {
      comments: (node, comment) => {
        // Preserve license banner comments
        return comment.value.includes('With ❤️, by ')
      }
    }
  })
]

/** @type {import('rollup').RollupOptions[]} */
let configs = [
  defineConfig({
    input: {
      decode: './src/decode.ts'
    },
    output: {
      dir: 'dist',
      name,
      format: 'es',
      ...settings
    },
    plugins: [
      del({ targets: 'dist/*' }),
      ...plugins
    ],
    ...configBase
  }),

  // ES modules minified
  defineConfig({
    input: {
      decode: './src/decode.ts'
    },
    output: {
      dir: 'dist',
      entryFileNames: '[name].min.js',
      name,
      format: 'es',
      ...settings
    },
    plugins: [
      ...pluginsMinified
    ],
    ...configBase
  })
]

// configs to produce when not testing
// with playwright
if (!process.env.PLAYWRIGHT_TESTING) {
  configs = configs.concat([
    // decode UMD
    defineConfig({
      input: './src/decode.ts',
      output: {
        format: 'umd',
        name,
        file: 'dist/decode.umd.js',
        ...settings
      },
      plugins,
      ...configBase
    }),

    // decode UMD minified
    defineConfig({
      input: './src/decode.ts',
      output: {
        format: 'umd',
        name,
        file: 'dist/decode.umd.min.js',
        ...settings
      },
      plugins: pluginsMinified,
      ...configBase
    })
  ])
}

export default configs
