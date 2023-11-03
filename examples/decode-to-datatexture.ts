/* eslint-disable unused-imports/no-unused-vars */

import { decode } from '@monogrid/gainmap-js'
import { decodeJPEGMetadata } from '@monogrid/gainmap-js/libultrahdr'
import {
  DataTexture,
  HalfFloatType,
  LinearFilter,
  LinearMipMapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  NoColorSpace,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
  RGBAFormat,
  Scene,
  UVMapping,
  WebGLRenderer
} from 'three'

// fetch a JPEG image containing a gainmap as ArrayBuffer
const gainmap = await (await fetch('gainmap.jpeg')).arrayBuffer()

// extract data from the JPEG
const { sdr, gainMap, parsedMetadata } = await decodeJPEGMetadata(new Uint8Array(gainmap))

// restore the HDR texture
// !!!
// NOTICE THE ABSCENCE
// OF THE `renderer`parameter
// !!!
const result = await decode({
  sdr,
  gainMap,
  // this will restore the full HDR range
  maxDisplayBoost: Math.pow(2, parsedMetadata.hdrCapacityMax),
  ...parsedMetadata
})

// create the datatexture from the result array
const map = new DataTexture(
  result.toArray(), // get data
  result.width, // width is provided
  result.height, // height is provided
  RGBAFormat, // must be RGBAFormat
  HalfFloatType, // must be HalfFloatType
  UVMapping,
  RepeatWrapping,
  RepeatWrapping,
  LinearFilter,
  LinearMipMapLinearFilter,
  1,
  NoColorSpace // must be NoColorSpace
)

const scene = new Scene()
const mesh = new Mesh(
  new PlaneGeometry(),
  new MeshBasicMaterial({ map })
)
scene.add(mesh)

const renderer = new WebGLRenderer()
renderer.render(scene, new PerspectiveCamera())
