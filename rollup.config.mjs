import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'
import license from 'rollup-plugin-license'

import pkgJSON from './package.json' assert { type: 'json' }

const { author, browser, main, name, version } = pkgJSON

const settings = {
  globals: { three: 'three' }
}

export default defineConfig({
  input: './src/index.ts',
  output: [
    {
      file: main,
      name: main,
      ...settings,
      format: 'cjs',
      plugins: [
        terser()
      ]
    },
    {
      dir: 'dist/esm',
      ...settings,
      name,
      format: 'es',
      preserveModules: true,
      preserveModulesRoot: 'src'
    },
    {
      file: browser,
      ...settings,
      name,
      format: 'umd'
    }
  ],
  external: ['three'],

  plugins: [
    json(),
    typescript({
      declaration: true,
      declarationDir: 'dist/esm',
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
        Copyright 2016<%= moment().format('YYYY') > 2018 ? '-' + moment().format('YYYY') : null %> ${author}
      `
    })
  ]
})
