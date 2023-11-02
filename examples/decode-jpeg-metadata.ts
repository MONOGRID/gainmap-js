/* eslint-disable unused-imports/no-unused-vars */

import { decode } from 'gainmap-js'
import { decodeJPEGMetadata } from 'gainmap-js/libultrahdr'
import { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'
// fetch a JPEG image containing a gainmap as ArrayBuffer
const gainmap = await (await fetch('gainmap.jpeg')).arrayBuffer()

// extract data from the JPEG
const { sdr, gainMap, parsedMetadata } = await decodeJPEGMetadata(new Uint8Array(gainmap))

// restore the HDR texture
const result = await decode({
  sdr,
  gainMap,
  // this will restore the full HDR range
  maxDisplayBoost: Math.pow(2, parsedMetadata.hdrCapacityMax),
  ...parsedMetadata
})

// result can be used to populate a Texture
const mesh = new Mesh(new PlaneGeometry(), new MeshBasicMaterial({ map: result.renderTarget.texture }))
