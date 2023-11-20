/** @type {import('typedoc').TypeDocOptions} */
module.exports = {
  entryPoints: ['./src/core/index.ts', './src/decode.ts', './src/encode.ts', './src/libultrahdr.ts', './src/worker-interface.ts'],
  tsconfig: './src/tsconfig.json',
  // entryPointStrategy: 'Merge',
  out: 'wiki',
  plugin: ['typedoc-plugin-markdown', 'typedoc-github-wiki-theme'],
  excludeExternals: true,
  excludePrivate: true,
  excludeInternal: true,
  validation: {
    notExported: true,
    invalidLink: true,
    notDocumented: false
  },
  treatWarningsAsErrors: true
}
