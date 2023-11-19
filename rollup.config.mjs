import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'
import copy from 'rollup-plugin-copy'
import license from 'rollup-plugin-license'

// @ts-expect-error tsc + rollup fight each other
import pkgJSON from './package.json' assert { type: 'json' }

const { author, name, version } = pkgJSON

/** @type {import('rollup').OutputOptions} */
const settings = {
  globals: {
    three: 'three'
  }
}

const configBase = defineConfig({
  external: ['three'],
  plugins: [
    json(),
    copy({
      targets: [
        { src: 'libultrahdr-wasm/build/libultrahdr-esm.wasm', dest: 'dist' }
      ]
    }),
    typescript({
      tsconfig: 'src/tsconfig.json',
      declaration: true,
      declarationDir: 'dist',
      include: ['src/**/*.ts']
    }),
    resolve(),
    commonjs({
      include: 'node_modules/**',
      extensions: ['.js'],
      ignoreGlobal: false,
      sourceMap: false
    }),
    license({
      banner: `
        ${name} v${version}
        With ❤️, by ${author}
      `
    })
  ]
})

export default [
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
    ...configBase
  }),
  defineConfig({
    input: './src/encode.ts',
    output: {
      format: 'umd',
      name,
      file: 'dist/encode.umd.js',
      ...settings
    },
    ...configBase
  }),
  defineConfig({
    input: './src/decode.ts',
    output: {
      format: 'umd',
      name,
      file: 'dist/decode.umd.js',
      ...settings
    },
    ...configBase
  }),
  defineConfig({
    input: './src/libultrahdr.ts',
    output: {
      format: 'umd',
      name: 'libultrahdr',
      file: 'dist/libultrahdr.umd.js',
      ...settings
    },
    ...configBase
  }),
  defineConfig({
    input: './src/worker.ts',
    output: {
      format: 'umd',
      name: 'worker',
      file: 'dist/worker.umd.js',
      ...settings
    },
    ...configBase
  }),
  defineConfig({
    input: './src/worker-interface.ts',
    output: {
      format: 'umd',
      name: 'worker-interface',
      file: 'dist/worker-interface.umd.js',
      ...settings
    },
    ...configBase
  })
]
