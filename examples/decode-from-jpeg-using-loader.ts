/* eslint-disable unused-imports/no-unused-vars */
import { HDRJPGLoader } from '@monogrid/gainmap-js'
import {
  EquirectangularReflectionMapping,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer
} from 'three'

const renderer = new WebGLRenderer()

const loader = new HDRJPGLoader(renderer)

const result = await loader.loadAsync('gainmap.jpeg')
// `result` can be used to populate a Texture

const scene = new Scene()
const mesh = new Mesh(
  new PlaneGeometry(),
  new MeshBasicMaterial({ map: result.renderTarget.texture })
)
scene.add(mesh)
renderer.render(scene, new PerspectiveCamera())

// Starting from three.js r159
// `result.renderTarget.texture` can
// also be used as Equirectangular scene background
//
// it was previously needed to convert it
// to a DataTexture with `result.toDataTexture()`
scene.background = result.renderTarget.texture
scene.background.mapping = EquirectangularReflectionMapping

// result must be manually disposed
// when you are done using it
result.dispose()
