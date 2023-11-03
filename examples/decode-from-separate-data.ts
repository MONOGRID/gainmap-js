/* eslint-disable unused-imports/no-unused-vars */
import { decode } from '@monogrid/gainmap-js'
import {
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  TextureLoader,
  WebGLRenderer
} from 'three'

const renderer = new WebGLRenderer()

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
