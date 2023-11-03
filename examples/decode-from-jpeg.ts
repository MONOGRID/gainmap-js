/* eslint-disable unused-imports/no-unused-vars */

import { decode } from '@monogrid/gainmap-js'
import { decodeJPEGMetadata } from '@monogrid/gainmap-js/libultrahdr'
import {
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer
} from 'three'

const renderer = new WebGLRenderer()

// fetch a JPEG image containing a gainmap as ArrayBuffer
const gainmap = await (await fetch('gainmap.jpeg')).arrayBuffer()

// extract data from the JPEG
const { sdr, gainMap, parsedMetadata } = await decodeJPEGMetadata(new Uint8Array(gainmap))

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
