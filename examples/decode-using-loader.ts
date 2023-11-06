/* eslint-disable unused-imports/no-unused-vars */
import { GainMapLoader } from '@monogrid/gainmap-js'
import {
  EquirectangularReflectionMapping,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer
} from 'three'

const renderer = new WebGLRenderer()

const loader = new GainMapLoader(renderer)

const result = loader.load('gainmap.jpeg')
// `result` can be used to populate a Texture

const scene = new Scene()
const mesh = new Mesh(
  new PlaneGeometry(),
  new MeshBasicMaterial({ map: result.renderTarget.texture })
)
scene.add(mesh)
renderer.render(scene, new PerspectiveCamera())

// `result.renderTarget.texture` must be
// converted to `DataTexture` in order
// to use it as Equirectanmgular scene background
// if needed

scene.background = result.toDataTexture()
scene.background.mapping = EquirectangularReflectionMapping
scene.background.minFilter = LinearFilter
