// rollup.config.js
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'
import license from 'rollup-plugin-license'

import { author, browser, main, module, name, version } from './package.json'

const isProduction = process.env.NODE_ENV === 'production'

const settings = {
  // globals: {
  //   ms: 'ms'
  // }
}

export default defineConfig({
  input: './src/index.ts',
  output: [{
    file: main,
    name: main,
    ...settings,
    format: 'cjs',
    plugins: [
      isProduction && terser()
    ]
  }, {
    file: module,
    ...settings,
    name,
    format: 'es'
  }, {
    file: browser,
    ...settings,
    name,
    format: 'umd'
  }],
  external: ['three'],

  plugins: [
    json(),
    resolve(),
    typescript({
      declaration: true,
      declarationDir: '',
      exclude: ['rollup.config.ts']
    }),
    commonjs({
      include: 'node_modules/**',
      extensions: ['.js'],
      ignoreGlobal: false,
      sourceMap: false
    }),
    license({
      banner: `
        ${name} v${version}
        Copyright 2016<%= moment().format('YYYY') > 2018 ? '-' + moment().format('YYYY') : null %> ${author}
      `
    })
  ]
})
