// Worker entry used by worker.test.ts, bundled with three.js at test time (workers can't use the page import map).
// Renders the same scene as testNodeLoaderInBrowser (see ../loaders/node-loaders.ts) on an OffscreenCanvas
import * as THREE from 'three/webgpu'

import { GainMapNodeLoader, HDRJPGNodeLoader } from '../../../../dist/decode.webgpu.js'

self.onmessage = async ({ data: { canvas, files, width, height } }) => {
  try {
    const renderer = new THREE.WebGPURenderer({ canvas })
    await renderer.init()
    renderer.toneMapping = THREE.LinearToneMapping
    renderer.setSize(width, height, false)

    const hdr = typeof files === 'string'
      ? await new HDRJPGNodeLoader().loadAsync(files)
      : await new GainMapNodeLoader().loadAsync(files)

    const scene = new THREE.Scene()
    const material = new THREE.MeshBasicNodeMaterial()
    material.colorNode = hdr
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(), material)
    const ratio = hdr.width / hdr.height
    plane.scale.y = Math.min(1, 1 / ratio)
    plane.scale.x = Math.min(1, ratio)
    scene.add(plane)

    hdr.decode(renderer)
    hdr.value.mapping = THREE.EquirectangularReflectionMapping
    scene.background = hdr.value

    const camera = new THREE.PerspectiveCamera()
    camera.position.z = 3
    renderer.render(scene, camera)
    // make sure the frame is on the canvas before reporting back
    await new Promise(resolve => requestAnimationFrame(resolve))

    self.postMessage({ width: hdr.width, height: hdr.height })
  } catch (e) {
    self.postMessage({ error: e instanceof Error ? e.message : String(e) })
  }
}
