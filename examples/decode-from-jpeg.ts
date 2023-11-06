/* eslint-disable unused-imports/no-unused-vars */

import { decode } from '@monogrid/gainmap-js'
import { decodeJPEGMetadata } from '@monogrid/gainmap-js/libultrahdr'
import {
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipMapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  NoColorSpace,
  PerspectiveCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  SRGBColorSpace,
  Texture,
  UnsignedByteType,
  UVMapping,
  WebGLRenderer
} from 'three'

const renderer = new WebGLRenderer()

// fetch a JPEG image containing a gainmap as ArrayBuffer
const gainmap = new Uint8Array(await (await fetch('gainmap.jpeg')).arrayBuffer())

// extract data from the JPEG
const { gainMap: gainMapBuffer, parsedMetadata } = await decodeJPEGMetadata(gainmap)

// create data blobs
const gainMapBlob = new Blob([gainMapBuffer], { type: 'image/jpeg' })
// TODO: figure out why result.sdr is not usable here, problem is in the libultrahdr-wasm repo
// we use the original image buffer instead
const sdrBlob = new Blob([gainmap], { type: 'image/jpeg' })

// create ImageBitmap data
const [gainMapImageBitmap, sdrImageBitmap] = await Promise.all([
  createImageBitmap(gainMapBlob, { imageOrientation: 'flipY' }),
  createImageBitmap(sdrBlob, { imageOrientation: 'flipY' })
])

// create textures
const gainMap = new Texture(gainMapImageBitmap,
  UVMapping,
  ClampToEdgeWrapping,
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipMapLinearFilter,
  RGBAFormat,
  UnsignedByteType,
  1,
  NoColorSpace
)

gainMap.needsUpdate = true

// create textures
const sdr = new Texture(sdrImageBitmap,
  UVMapping,
  ClampToEdgeWrapping,
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipMapLinearFilter,
  RGBAFormat,
  UnsignedByteType,
  1,
  SRGBColorSpace
)

sdr.needsUpdate = true

// restore the HDR texture
const result = await decode({
  sdr,
  gainMap,
  // this allows to use `result.renderTarget.texture` directly
  renderer,
  // this will restore the full HDR range
  maxDisplayBoost: Math.pow(2, parsedMetadata.hdrCapacityMax),
  ...parsedMetadata
})

const scene = new Scene()
// `result` can be used to populate a Texture
const mesh = new Mesh(
  new PlaneGeometry(),
  new MeshBasicMaterial({ map: result.renderTarget.texture })
)
scene.add(mesh)
renderer.render(scene, new PerspectiveCamera())
