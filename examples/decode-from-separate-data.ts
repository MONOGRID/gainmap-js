/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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

const textureLoader = new TextureLoader()

// load SDR Representation
const sdr = await textureLoader.loadAsync('sdr.jpg')
// load Gain map recovery image
const gainMap = await textureLoader.loadAsync('gainmap.jpg')
// load metadata
const metadata = await (await fetch('metadata.json')).json()

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
