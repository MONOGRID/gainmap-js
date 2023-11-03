import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'
import copy from 'rollup-plugin-copy'
import license from 'rollup-plugin-license'

import pkgJSON from './package.json' assert { type: 'json' }

const { author, name, version } = pkgJSON

const settings = {
  globals: {
    three: 'three'
  }
}

export default defineConfig({
  input: ['./src/index.ts', './src/libultrahdr.ts', './src/worker.ts', './src/worker-interface.ts'],
  output: [
    {
      dir: 'dist',
      ...settings,
      name,
      format: 'es'
      // preserveModules: true,
      // preserveModulesRoot: 'src'
    }
  ],
  external: ['three'],

  plugins: [
    json(),
    copy({
      targets: [
        { src: 'libultrahdr-wasm/build/libultrahdr-esm.wasm', dest: 'dist' }
      ]
    }),
    typescript({
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
