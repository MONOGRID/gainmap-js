/* eslint-disable unused-imports/no-unused-vars */
import { decode } from 'gainmap-js'
import { Mesh, MeshBasicMaterial, PlaneGeometry, TextureLoader } from 'three'

const loader = new TextureLoader()

// load SDR Representation
const sdr = await loader.loadAsync('sdr.jpg')
// load Gain map recovery image
const gainMap = await loader.loadAsync('gainmap.jpg')
// load metadata
const metadata = await (await fetch('metadata.json')).json()

const result = await decode({
  sdr,
  gainMap,
  // this will restore the full HDR range
  maxDisplayBoost: Math.pow(2, metadata.hdrCapacityMax),
  ...metadata
})

// result can be used to populate a Texture
const mesh = new Mesh(new PlaneGeometry(), new MeshBasicMaterial({ map: result.renderTarget.texture }))
