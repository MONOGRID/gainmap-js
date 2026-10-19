# gainmap-js
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FMONOGRID%2Fgainmap-js.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2FMONOGRID%2Fgainmap-js?ref=badge_shield)

A Javascript (TypeScript) Encoder/Decoder Implementation of Adobe's Gain Map Technology for storing HDR Images using an SDR Image + a "Gain map"

> :warning: This library is intended for encoding and decoding gain map images for the [three.js](https://github.com/mrdoob/three.js/) 3D Library
>
> It can be used for general encode/decode of gain maps but it depends on the three.js library which, in itself, is quite heavy if you only use it to encode/decode gain maps.

## Share Your Project!
Have you built something awesome using this library? We’d love to see what you’ve created!
Whether it’s a small demo or a full-scale application, your project can inspire others and help improve the library. Please share your work in one of these ways:
* GitHub Issues: [Open a new issue](https://github.com/MONOGRID/gainmap-js/issues/new) in this repository with a brief description, screenshots, and links to your project.
* Email: Send us an email at gainmap@monogrid.com with your project details.
Your contributions and creative ideas make our community stronger. We can’t wait to see what you build!

## Live Demo

* [WebGPU Version (node loaders)](https://monogrid.github.io/gainmap-js/webgpu-node.html)
* [Legacy WebGL Version](https://monogrid.github.io/gainmap-js/)

Both compares loading:
 1. a `JPEG` file with embedded gain map data
 2. a `webp` sdr file + a `webp` gain map + metadata JSON
 3. a comparable size `.hdr` file for comparison

## Benchmark

[Loader benchmark](https://monogrid.github.io/gainmap-js/benchmark.html): compares `HDRJPGNodeLoader` (GPU decode) against three.js `UltraHDRLoader` (CPU decode), loading the same gain map JPEGs in your browser.

## [Free online encoder](https://gainmap-creator.monogrid.com)

Use it to convert `.hdr` and `.exr` files into gain maps. It's free and the whole process happens in your browser.

## Installing
```bash
$ npm install @monogrid/gainmap-js three
```

## What is a Gain map?

[See here](https://gregbenzphotography.com/hdr-images/jpg-hdr-gain-maps-in-adobe-camera-raw/) for a detailed explanation, here are some relevant parts:

> A gain map is a single file with a second pseudo-image embedded in it to create an optimized result for a specific monitor. It can be used to generate the HDR version (which looks dramatically better where supported), the SDR version (without tone mapping to ensures great quality), or anything in between (to better support less capable HDR displays).

> Gain maps are not a new type of file, but rather a technology which can be embedded into a variety of image formats. There are reference specs already for the JPG, AVIF, JXL, and HEIF file formats. JPG is especially notable as it could not properly support HDR without gain maps and it offers a very useful bridge to the future (i.e. highly compatible with today’s software).

> A gain map includes:
>
> * A **base (default) image**. This can be an SDR or an HDR image (JPG gain maps are always encoded with SDR as the base). If the browser or viewing software does not understand gain maps, it will just the treat file as if it were just the base image.
> * The **gain map**. This is a secondary “image” embedded in the file. It is not a real image, but rather contains data to convert each pixel from the base image into the other (SDR or HDR) version of the image.
>* Gain map **metadata**. This tells the browser how the gain map is encoded as well as critical information to optimize rendering on any display.

Please note that Google [is adopting the gain map technology in Android 14](https://support.google.com/photos/answer/14159275) but its naming of the technology refers to it as **Ultra HDR Image Format** and a JPEG file with embedded gain map is [apparently called JPEGR](https://github.com/google/libultrahdr/blob/3a3a752a5da0b2304b1b6de0ef383bbe41256a67/lib/jpegr.h#L28C16-L28C21) in their terminology, we call it `HDRJPEG` for the moment.

## API

Refer to the [WIKI](https://github.com/MONOGRID/gainmap-js/wiki) for detailed documentation about the API.

## Examples

### Decoding

The main use case of this library is to decode a JPEG file that contains gain map data
and use it instead of a traditional `.exr` or `.hdr` image.

The recommended way is to use the **node loaders** from the `@monogrid/gainmap-js/webgpu` entry point,
together with three.js `WebGPURenderer`.

Node loaders return a `GainMapNode`: a [TSL](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language) texture node holding the decoded HDR image.

* **No renderer needed**: `load()` returns the node synchronously (like `TextureLoader` returns a `Texture`), it can be assigned to materials right away.
* **Decoded on the GPU** into a HalfFloat render target, and only when something changes: sampling the node costs a single texture read.
* **Every parameter is a uniform**: changing e.g. `maxDisplayBoost` re-decodes the image (and the environment PMREM) once, on the next frame.

> NOTE: Starting from v3.1.0 Decoding also works in a WebWorker, thanks to [Alejandro Romano](https://github.com/Arecsu) for the [contribution](https://github.com/MONOGRID/gainmap-js/pull/59)

#### Using a single JPEG with embedded Gain map Metadata

This approach lets you load a single file with an embedded Gain Map.

The advantage is to have a single file to load.

The disadvantages are:
 * No WEBP compression
 * Editing software that does not support gain maps will only see (and save) the SDR image, discarding the HDR information.
   Software support is growing: Adobe Lightroom and Camera Raw and Pixelmator Pro can export gain map JPEGs,
   while others (e.g. GIMP, Affinity) can't yet, and Photoshop needs Camera Raw or third party plugins.
   You can also use our [free online encoder](https://gainmap-creator.monogrid.com) to create them from `.hdr` and `.exr` files.
 * Many websites and services (e.g. Facebook, Slack) re-encode uploaded images and strip the gain map, leaving you with only the SDR Representation.
   Serve the files yourself, unmodified, to keep the HDR information.

```ts
import { HDRJPGNodeLoader } from '@monogrid/gainmap-js/webgpu'
import { equirectUV } from 'three/tsl'
import {
  EquirectangularReflectionMapping,
  Mesh,
  MeshBasicNodeMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGPURenderer
} from 'three/webgpu'

const renderer = new WebGPURenderer()
await renderer.init()

// no renderer needed, `hdr` is a TSL texture node which can be used right away
// the image is decoded on the GPU once loaded
const hdr = new HDRJPGNodeLoader().load('gainmap.jpeg', () => {
  // `hdr.value` is the decoded HDR texture, for APIs requiring a Texture
  // it's kept up to date as long as the node is used in a rendered node graph
  // (here: the plane material and the background), otherwise call `hdr.decode(renderer)`
  // assign it once loaded: the texture gets its final size on load and PMREMs don't follow resizes
  hdr.value.mapping = EquirectangularReflectionMapping
  scene.environment = hdr.value
})

const scene = new Scene()
const material = new MeshBasicNodeMaterial()
material.colorNode = hdr
scene.add(new Mesh(new PlaneGeometry(), material))

// sample with different uvs, e.g. as an equirectangular background
scene.backgroundNode = hdr.sample(equirectUV())

// every parameter is a uniform: changing it re-decodes the image (and the environment PMREM) once
hdr.maxDisplayBoost.value = 2

renderer.render(scene, new PerspectiveCamera())

// the node must be manually disposed when you are done using it
hdr.dispose()
```

#### Using separate files

Using separate files will get rid of the limitations of using a single JPEG file but it will force to use three separate files

1. An SDR Representation file
2. A Gainmap file
3. A JSON containing the gainmap metadata used for decoding

```ts
import { GainMapNodeLoader } from '@monogrid/gainmap-js/webgpu'
import {
  Mesh,
  MeshBasicNodeMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGPURenderer
} from 'three/webgpu'

const renderer = new WebGPURenderer()
await renderer.init()

const hdr = new GainMapNodeLoader().load([
  'sdr.webp',
  'gainmap.webp',
  'metadata.json'
])

const scene = new Scene()
const material = new MeshBasicNodeMaterial()
material.colorNode = hdr
scene.add(new Mesh(new PlaneGeometry(), material))

renderer.render(scene, new PerspectiveCamera())

// the node must be manually disposed when you are done using it
hdr.dispose()
```

#### Migrating to v4.0.0

> [!WARNING]
> The render target based decoding APIs of `@monogrid/gainmap-js/webgpu` are deprecated and **will be removed in v4.0.0**:
> `HDRJPGLoader`, `JPEGRLoader`, `GainMapLoader`, `decode()`, `GainMapDecoderMaterial` and `QuadRenderer`.
> The loaders and `decode()` log a deprecation warning once when used.
>
> The `WebGLRenderer` APIs of the main `@monogrid/gainmap-js` entry point are **not** deprecated.
>
> From v4.0.0 the node loaders are the only way to decode gain maps with `WebGPURenderer`.

If you are using the `WebGPURenderer` render target based APIs, switch to the node loaders. If you are still on `WebGLRenderer` you can keep using `@monogrid/gainmap-js`, or move to `WebGPURenderer` from `three/webgpu`: it falls back to a WebGL2 backend
where WebGPU is not available, so the node loaders work in the same browsers. Use `new WebGPURenderer({ forceWebGL: true })`
to keep the WebGL2 backend everywhere. Materials need to be node materials (`MeshBasicNodeMaterial`, `MeshStandardNodeMaterial`, ...),
or regular materials using `hdr.value` as a texture.

The node loaders are **not a drop-in replacement**: they return a `GainMapNode` instead of a render target.

| Before (deprecated, `@monogrid/gainmap-js/webgpu`) | After |
| --- | --- |
| `new HDRJPGLoader(renderer)` | `new HDRJPGNodeLoader()`, no renderer |
| `new GainMapLoader(renderer)` | `new GainMapNodeLoader()`, no renderer |
| `decode({ sdr, gainMap, renderer, ...metadata })` | `gainMapNode(sdr, gainMap, metadata)` |
| `await loader.loadAsync(url)` | `loader.load(url)` returns the node right away, `loadAsync` resolves once loaded |
| `result.renderTarget.texture` | `hdr` in node materials (`material.colorNode = hdr`), `hdr.value` where a `Texture` is needed |
| `material.map = result.renderTarget.texture` | `material.colorNode = hdr` (or `hdr.sample(uv)`) |
| `scene.background = result.renderTarget.texture` | `scene.backgroundNode = hdr.sample(equirectUV())` |
| `setRenderTargetOptions({ mapping })` | `hdr.value.mapping = ...` once loaded |
| `result.material.maxDisplayBoost = 2; result.render()` | `hdr.maxDisplayBoost.value = 2`, re-decoded on the next frame |
| `result.toDataTexture()` / `result.toArray()` | `await renderer.readRenderTargetPixelsAsync(hdr.renderTarget, 0, 0, hdr.width, hdr.height)` |
| `result.dispose()` | `hdr.dispose()` |

When the node is not part of a rendered node graph (e.g. only `scene.environment = hdr.value` is used),
call `hdr.decode(renderer)` after load to update its texture.

#### Switching from the WebGL encoder to the node based encoder

The WebGL encoder is not deprecated, you can keep using it. The node based encoder is available as an alternative with `WebGPURenderer`.

With `LinearToneMapping` the node based encoder produces the same images as the WebGL encoder (byte for byte on the WebGL2 backend,
within 1/255 on a handful of pixels on the WebGPU backend, where shaders compile differently).
Other tone mappings use the three.js TSL tone mapping functions, so their SDR rendition differs from the one of the WebGL encoder.
Brightness, contrast and saturation are applied after tone mapping: `LinearToneMapping` now clamps values above 1 before they are applied.

| WebGL encoder (`@monogrid/gainmap-js/encode`) | Node based encoder (`@monogrid/gainmap-js/encode/webgpu`) |
| --- | --- |
| `encode({ image, maxContentBoost, ... })` | `new GainMapEncoder(image, { maxContentBoost, ... })`, no renderer |
| `findTextureMinMax(image)` | `await findTextureMinMax(image, 'max', renderer)`, or `await encoder.fitMaxContentBoost(renderer)` |
| `result.sdr.material.exposure = 0.9; result.sdr.render()` | `encoder.sdr.exposure.value = 0.9`, re-rendered when next used |
| `result.sdr.material.toneMapping = AgXToneMapping` | `encoder.sdr.setToneMapping(AgXToneMapping)` |
| `result.gainMap.material.gamma = [1.1, 1.1, 1.1]` | `encoder.gainMap.gamma.value.setScalar(1.1)` |
| `result.getMetadata()` | `encoder.metadata` |
| `result.sdr.renderTarget.texture` | `encoder.sdr` in node materials, `encoder.sdr.value` where a `Texture` is needed |
| `decode({ sdr: result.sdr.renderTarget.texture, ... })` to preview | `encoder.createPreviewNode()`, it follows parameter changes |
| `new ImageData(result.sdr.toArray(), ...)` + `compress({ flipY: true })` | `(await encoder.read(renderer)).sdr`, upright, no `flipY` |
| `await encodeAndCompress({ ... })` | `await encoder.compress(renderer, { mimeType, quality, withWorker })` |
| `result.sdr.dispose(); result.gainMap.dispose()` | `encoder.dispose()` |

#### Decoding with WebGLRenderer

The main `@monogrid/gainmap-js` entry point exposes `HDRJPGLoader` and `GainMapLoader`, which decode into a `WebGLRenderTarget`.

```ts
import { HDRJPGLoader } from '@monogrid/gainmap-js'
import { EquirectangularReflectionMapping, Scene, WebGLRenderer } from 'three'

const renderer = new WebGLRenderer()
const scene = new Scene()

const result = await new HDRJPGLoader(renderer)
  .setRenderTargetOptions({ mapping: EquirectangularReflectionMapping })
  .loadAsync('gainmap.jpeg')
// or: await new GainMapLoader(renderer).loadAsync(['sdr.webp', 'gainmap.webp', 'metadata.json'])

scene.background = result.renderTarget.texture

// result must be manually disposed
// when you are done using it
result.dispose()
```

Other decoding APIs (the `GainMapNode` constructor, `decode()` and the deprecated render target based
`HDRJPGLoader` / `GainMapLoader` for `WebGPURenderer`) are documented in the [WIKI](https://github.com/MONOGRID/gainmap-js/wiki).

### Encoding

Encoding a Gain map starting from an EXR file.

This is generally not useful in a `three.js` site but this library exposes methods
that allow to encode an `.exr` or `hdr` file into a `jpeg` with an embedded gain map.

`GainMapEncoder` encodes on the GPU with TSL nodes, no renderer is needed until the result is read back.
`encoder.sdr` (the SDR rendition) and `encoder.gainMap` are live texture nodes: every encoding parameter is a uniform,
changing one re-renders only the affected nodes, once, the next time they are used.
This makes it suitable for interactive editors as well.

```ts
import { GainMapEncoder } from '@monogrid/gainmap-js/encode/webgpu'
import { encodeJPEGMetadata } from '@monogrid/gainmap-js/libultrahdr'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { AgXToneMapping, LinearToneMapping, WebGPURenderer } from 'three/webgpu'

const renderer = new WebGPURenderer()
await renderer.init()

// load an HDR file (raw texture data and TSL nodes are accepted too)
const image = await new EXRLoader().loadAsync('image.exr')

const encoder = new GainMapEncoder(image, { toneMapping: AgXToneMapping })
// encode the full HDR range
await encoder.fitMaxContentBoost(renderer)

// optional: live previews, they follow any parameter change
sdrMaterial.colorNode = encoder.sdr
gainMapMaterial.colorNode = encoder.gainMap
hdrMaterial.colorNode = encoder.createPreviewNode() // a GainMapNode decoding the encoded result

// every parameter is a uniform
encoder.sdr.exposure.value = 0.9
encoder.sdr.setToneMapping(LinearToneMapping)
encoder.gainMap.gamma.value.setScalar(1.1)

// read back and compress, no flipY needed
const result = await encoder.compress(renderer, { mimeType: 'image/jpeg', quality: 0.9 })

// embed the compressed images + metadata into a single JPEG file
const jpeg = encodeJPEGMetadata(result)

// `jpeg` will be an `Uint8Array` which can be saved somewhere

// the encoder must be manually disposed when no longer needed
encoder.dispose()
```

The raw (uncompressed) images and the metadata are available with `await encoder.read(renderer)`,
`await findTextureMinMax(image, 'max', renderer)` finds the max (or min) value of each channel of an HDR image.

#### Encoding with WebGLRenderer


Encoding a Gain map starting from an EXR file.

This is generally not useful in a `three.js` site but this library exposes methods
that allow to encode an `.exr` or `hdr` file into a `jpeg` with an embedded gain map.

```ts
import { compress, encode, findTextureMinMax } from '@monogrid/gainmap-js/encode'
import { encodeJPEGMetadata } from '@monogrid/gainmap-js/libultrahdr'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'

// load an HDR file
const loader = new EXRLoader()
const image = await loader.loadAsync('image.exr')

// find RAW RGB Max value of a texture
const textureMax = findTextureMinMax(image)

// Encode the gainmap
const encodingResult = encode({
  image,
  // this will encode the full HDR range
  maxContentBoost: Math.max.apply(this, textureMax)
})

// obtain the RAW RGBA SDR buffer and create an ImageData
const sdrImageData = new ImageData(encodingResult.sdr.toArray(), encodingResult.sdr.width, encodingResult.sdr.height)
// obtain the RAW RGBA Gain map buffer and create an ImageData
const gainMapImageData = new ImageData(encodingResult.gainMap.toArray(), encodingResult.gainMap.width, encodingResult.gainMap.height)

// parallel compress the RAW buffers into the specified mimeType
const mimeType = 'image/jpeg'
const quality = 0.9

const [sdr, gainMap] = await Promise.all([
  compress({
    source: sdrImageData,
    mimeType,
    quality,
    flipY: true // output needs to be flipped
  }),
  compress({
    source: gainMapImageData,
    mimeType,
    quality,
    flipY: true // output needs to be flipped
  })
])

// obtain the metadata which will be embedded into
// and XMP tag inside the final JPEG file
const metadata = encodingResult.getMetadata()

// embed the compressed images + metadata into a single
// JPEG file
const jpeg = encodeJPEGMetadata({
  ...encodingResult,
  ...metadata,
  sdr,
  gainMap
})

// `jpeg` will be an `Uint8Array` which can be saved somewhere

// encoder must be manually disposed
// when no longer needed
encodingResult.gainMap.dispose()
encodingResult.sdr.dispose()

```

## Libultrahdr in Vite

If you import `@monogrid/gainmap-js/libultrahdr`
You will need to exclude it from Vite optimizations.

```js
// vite.config.js

module.exports = defineConfig({
  ...
  optimizeDeps: {
    exclude: ['@monogrid/gainmap-js/libultrahdr']
  },
  ...
})
```


## Building

Clone the repository:
```bash
$ git clone git@github.com:MONOGRID/gainmap-js.git
$ cd gainmap-js
$ npm i
$ npm run build
```


## References

* [Adobe Gainmap Specification](https://helpx.adobe.com/camera-raw/using/gain-map.html)
* [Ultra HDR Image Format v1.0](https://developer.android.com/guide/topics/media/platform/hdr-image-format)


## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FMONOGRID%2Fgainmap-js.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FMONOGRID%2Fgainmap-js?ref=badge_large)
