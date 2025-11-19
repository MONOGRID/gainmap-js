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
    three: 'three',
    'three/webgpu': 'three/webgpu',
    'three/tsl': 'three/tsl'
  },
  sourcemap: !!process.env.PLAYWRIGHT_TESTING
}

const configBase = defineConfig({
  external: ['three', 'three/webgpu', 'three/tsl']
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
    thirdParty: { output: 'dist/third-party.txt' },
    sourcemap: !!process.env.PLAYWRIGHT_TESTING,
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
      encode: './src/encode.ts',
      decode: './src/decode.ts',
      'decode.webgpu': './src/decode/webgpu/index.ts',
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
      ...plugins
    ],
    ...configBase
  }),

  // ES modules minified
  defineConfig({
    input: {
      encode: './src/encode.ts',
      decode: './src/decode.ts',
      'decode.webgpu': './src/decode/webgpu/index.ts',
      libultrahdr: './src/libultrahdr.ts',
      worker: './src/worker.ts',
      'worker-interface': './src/worker-interface.ts'
    },
    output: {
      dir: 'dist',
      entryFileNames: '[name].min.js',
      name,
      format: 'es',
      ...settings
    },
    plugins: pluginsMinified,
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
  }),

  // worker UMD minified
  defineConfig({
    input: './src/worker.ts',
    output: {
      format: 'umd',
      name: 'worker',
      file: 'dist/worker.umd.min.cjs',
      ...settings
    },
    plugins: pluginsMinified,
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

    // decode UMD minified
    defineConfig({
      input: './src/decode.ts',
      output: {
        format: 'umd',
        name,
        file: 'dist/decode.umd.min.cjs',
        ...settings
      },
      plugins: pluginsMinified,
      ...configBase
    }),

    // decode webgpu UMD
    defineConfig({
      input: './src/decode/webgpu/index.ts',
      output: {
        format: 'umd',
        name,
        file: 'dist/decode.webgpu.umd.cjs',
        ...settings
      },
      plugins,
      ...configBase
    }),

    // decode webgpu UMD minified
    defineConfig({
      input: './src/decode/webgpu/index.ts',
      output: {
        format: 'umd',
        name,
        file: 'dist/decode.webgpu.umd.min.cjs',
        ...settings
      },
      plugins: pluginsMinified,
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

    // encode UMD minified
    defineConfig({
      input: './src/encode.ts',
      output: {
        format: 'umd',
        name: 'encode',
        file: 'dist/encode.umd.min.cjs',
        ...settings
      },
      plugins: pluginsMinified,
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

    // libultrahdr UMD minified
    defineConfig({
      input: './src/libultrahdr.ts',
      output: {
        format: 'umd',
        name: 'libultrahdr',
        file: 'dist/libultrahdr.umd.min.cjs',
        ...settings
      },
      plugins: pluginsMinified,
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
    }),

    // worker interface umd minified
    defineConfig({
      input: './src/worker-interface.ts',
      output: {
        format: 'umd',
        name: 'worker-interface',
        file: 'dist/worker-interface.umd.min.cjs',
        ...settings
      },
      plugins: pluginsMinified,
      ...configBase
    })
  ])
}

export default configs
