export * from '../../core/QuadRenderer'
export * from '../../core/types'
export * from '../shared'
export * from './decode'
export * from './loaders/GainMapLoader'
export * from './loaders/HDRJPGLoader'
/**
 * Legacy name
 * @deprecated Will be removed in v4.0.0. Use `HDRJPGNodeLoader` from `@monogrid/gainmap-js/webgpu` with `WebGPURenderer` (which also has a WebGL2 backend) instead: it is **not a drop-in replacement**, it returns a `GainMapNode` instead of a render target, see the [migration guide](https://github.com/MONOGRID/gainmap-js#migrating-to-v400).
 */
export { HDRJPGLoader as JPEGRLoader } from './loaders/HDRJPGLoader'
export * from './materials/GainMapDecoderMaterial'
