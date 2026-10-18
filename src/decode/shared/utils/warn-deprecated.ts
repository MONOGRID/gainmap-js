const warned = new Set<string>()

/**
 * Warns once per API that a render target based decode API is going away in v4.0.0
 *
 * @param name deprecated API
 * @param entry entry point exposing the deprecated API
 * @param replacement node based API replacing it, from `@monogrid/gainmap-js/webgpu`
 */
export const warnDeprecated = (name: string, entry: '@monogrid/gainmap-js' | '@monogrid/gainmap-js/webgpu', replacement: string) => {
  const key = `${entry}:${name}`
  if (warned.has(key)) return
  warned.add(key)
  console.warn(`gainmap-js: ${name} from '${entry}' is deprecated and will be removed in v4.0.0. Use ${replacement} from '@monogrid/gainmap-js/webgpu' with WebGPURenderer (which also has a WebGL2 backend) instead. It is not a drop-in replacement (it returns a GainMapNode, not a render target), see https://github.com/MONOGRID/gainmap-js#migrating-to-v400`)
}
