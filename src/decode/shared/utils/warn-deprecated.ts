const warned = new Set<string>()

/**
 * Warns once per API that a render target based API is going away in v4.0.0
 *
 * @param name deprecated API
 * @param entry entry point exposing the deprecated API
 * @param replacement node based API replacing it
 * @param replacementEntry entry point exposing the replacement
 * @param difference what changes with the replacement
 */
export const warnDeprecated = (
  name: string,
  entry: '@monogrid/gainmap-js' | '@monogrid/gainmap-js/webgpu' | '@monogrid/gainmap-js/encode',
  replacement: string,
  replacementEntry: '@monogrid/gainmap-js/webgpu' | '@monogrid/gainmap-js/encode/webgpu' = '@monogrid/gainmap-js/webgpu',
  difference = 'it returns a GainMapNode, not a render target'
) => {
  const key = `${entry}:${name}`
  if (warned.has(key)) return
  warned.add(key)
  console.warn(`gainmap-js: ${name} from '${entry}' is deprecated and will be removed in v4.0.0. Use ${replacement} from '${replacementEntry}' with WebGPURenderer (which also has a WebGL2 backend) instead. It is not a drop-in replacement (${difference}), see https://github.com/MONOGRID/gainmap-js#migrating-to-v400`)
}
