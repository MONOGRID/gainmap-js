/** @type {import('typedoc').TypeDocOptions} */
module.exports = {
  entryPoints: ['./src/index.ts', './src/libultrahdr.ts', './src/worker/worker.ts', './src/worker/worker-interface.ts'],
  out: 'doc',
  plugin: ['typedoc-plugin-markdown'],
  excludeExternals: true,
  excludePrivate: true,
  excludeInternal: true
}
