import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'
import copy from 'rollup-plugin-copy'
import del from 'rollup-plugin-delete'
// @ts-expect-error untyped library
import istanbul from 'rollup-plugin-istanbul'
import license from 'rollup-plugin-license'

// @ts-expect-error tsc + rollup fight each other
import pkgJSON from './package.json' assert { type: 'json' }

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
    include: ['src/**/*.ts']
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

/** @type {import('rollup').RollupOptions[]} */
let configs = [
  defineConfig({
    input: {
      encode: './src/encode.ts',
      decode: './src/decode.ts',
      libultrahdr: './src/libultrahdr.ts',
      worker: './src/worker.ts',
      'worker-interface': './src/worker-interface.ts'
    },
    output: {
      dir: 'dist',
      name,
      format: 'es',
      ...settings
    },
    plugins: [
      del({ targets: 'dist/*' }),
      copy({
        targets: [
          { src: 'libultrahdr-wasm/build/libultrahdr-esm.wasm', dest: 'dist' }
        ]
      }),
      ...plugins
    ],
    ...configBase
  }),

  // worker UMD
  defineConfig({
    input: './src/worker.ts',
    output: {
      format: 'umd',
      name: 'worker',
      file: 'dist/worker.umd.cjs',
      ...settings
    },
    plugins,
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
        file: 'dist/decode.umd.cjs',
        ...settings
      },
      plugins,
      ...configBase
    }),

    // encode UMD
    defineConfig({
      input: './src/encode.ts',
      output: {
        format: 'umd',
        name: 'encode',
        file: 'dist/encode.umd.cjs',
        ...settings
      },
      plugins,
      ...configBase
    }),

    // libultrahdr UMD
    defineConfig({
      input: './src/libultrahdr.ts',
      output: {
        format: 'umd',
        name: 'libultrahdr',
        file: 'dist/libultrahdr.umd.cjs',
        ...settings
      },
      plugins,
      ...configBase
    }),

    // worker interface umd
    defineConfig({
      input: './src/worker-interface.ts',
      output: {
        format: 'umd',
        name: 'worker-interface',
        file: 'dist/worker-interface.umd.cjs',
        ...settings
      },
      plugins,
      ...configBase
    })
  ])
}

export default configs
