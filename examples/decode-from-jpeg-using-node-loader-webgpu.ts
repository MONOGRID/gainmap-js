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
