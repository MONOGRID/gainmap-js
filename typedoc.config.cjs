/** @type {import('typedoc').TypeDocOptions} */
module.exports = {
  entryPoints: ['./src/index.ts', './src/libultrahdr.ts', './src/worker/worker.ts', './src/worker/worker-interface.ts'],
  out: 'wiki',
  plugin: ['typedoc-plugin-markdown', 'typedoc-github-wiki-theme'],
  excludeExternals: true,
  excludePrivate: true,
  excludeInternal: true
}
