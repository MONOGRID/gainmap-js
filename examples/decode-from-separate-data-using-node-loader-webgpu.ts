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

// no renderer needed, `hdr` is a TSL texture node which can be used right away
// the image is decoded on the GPU once loaded
const hdr = new GainMapNodeLoader().load([
  'sdr.jpeg',
  'gainmap.jpeg',
  'metadata.json'
])

const scene = new Scene()
const material = new MeshBasicNodeMaterial()
material.colorNode = hdr
scene.add(new Mesh(new PlaneGeometry(), material))

renderer.render(scene, new PerspectiveCamera())

// the node must be manually disposed when you are done using it
hdr.dispose()
