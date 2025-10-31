Examples of use cases using this library

Kept here for linting & typechecking purposes of the final use cases

## WebGL Examples

- `decode-from-jpeg.ts` - Decode a JPEG with embedded gain map using WebGL and the low-level decode function
- `decode-from-jpeg-using-loader.ts` - Decode a JPEG with embedded gain map using WebGL and HDRJPGLoader
- `decode-from-separate-data.ts` - Decode from separate files using WebGL and the low-level decode function
- `decode-from-separate-data-using-loader.ts` - Decode from separate files using WebGL and GainMapLoader

## WebGPU Examples

- `decode-from-jpeg-webgpu.ts` - Decode a JPEG with embedded gain map using WebGPU and the low-level decode function
- `decode-from-jpeg-using-loader-webgpu.ts` - Decode a JPEG with embedded gain map using WebGPU and HDRJPGLoader
- `decode-from-separate-data-webgpu.ts` - Decode from separate files using WebGPU and the low-level decode function
- `decode-from-separate-data-using-loader-webgpu.ts` - Decode from separate files using WebGPU and GainMapLoader

## Encoding Examples

- `encode.ts` - Encode a gain map from an HDR texture
- `encode-and-compress.ts` - Encode and compress a gain map
- `encode-jpeg-metadata.ts` - Encode gain map metadata into a JPEG file
- `compress.ts` - Compress image data

## Worker Example

- `worker.ts` - Decode gain maps in a Web Worker

## Integrated Examples

The `integrated/` folder contains complete HTML demos showing the library in action with both WebGL and WebGPU renderers.
