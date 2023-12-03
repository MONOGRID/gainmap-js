/* eslint-disable unused-imports/no-unused-vars */
import { decode, extractGainmapFromJPEG } from '@monogrid/gainmap-js'
import {
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipMapLinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  MeshBasicMaterial,
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
const jpeg = new Uint8Array(await (await fetch('gainmap.jpeg')).arrayBuffer())

// extract data from the JPEG
const { gainMap: gainMapBuffer, sdr: sdrBuffer, metadata } = await extractGainmapFromJPEG(jpeg)

// create data blobs
const gainMapBlob = new Blob([gainMapBuffer], { type: 'image/jpeg' })
const sdrBlob = new Blob([sdrBuffer], { type: 'image/jpeg' })

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
  LinearSRGBColorSpace
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
const result = decode({
  sdr,
  gainMap,
  // this allows to use `result.renderTarget.texture` directly
  renderer,
  // this will restore the full HDR range
  maxDisplayBoost: Math.pow(2, metadata.hdrCapacityMax),
  ...metadata
})

const scene = new Scene()
// `result` can be used to populate a Texture
const mesh = new Mesh(
  new PlaneGeometry(),
  new MeshBasicMaterial({ map: result.renderTarget.texture })
)
scene.add(mesh)
renderer.render(scene, new PerspectiveCamera())

// result must be manually disposed
// when you are done using it
result.dispose()
