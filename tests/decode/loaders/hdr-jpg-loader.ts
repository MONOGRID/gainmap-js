import * as decode from '@monogrid/gainmap-js'
import * as THREE from 'three'

export const testHDRJpegLoaderInBrowser = async (args: { file: string, exposure?:number } & Partial<decode.GainmapDecodingParameters>) => {
  const renderer = new THREE.WebGLRenderer()
  renderer.toneMapping = THREE.LinearToneMapping
  renderer.toneMappingExposure = args.exposure || 1
  document.body.append(renderer.domElement)
  renderer.setSize(window.innerWidth, window.innerHeight)
  const loader = new decode.HDRJPGLoader(renderer)

  const result = await loader.loadAsync(args.file)

  if (args.maxDisplayBoost) {
    result.material.maxDisplayBoost = args.maxDisplayBoost
    result.render()
  }

  const scene = new THREE.Scene()
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(),
    new THREE.MeshBasicMaterial({ map: result.renderTarget.texture })
  )
  const ratio = result.width / result.height
  plane.scale.y = Math.min(1, 1 / ratio)
  plane.scale.x = Math.min(1, ratio)
  scene.add(plane)

  scene.background = result.toDataTexture({
    mapping: THREE.EquirectangularReflectionMapping,
    minFilter: THREE.LinearFilter,
    generateMipmaps: false
  })
  scene.background.needsUpdate = true

  // result must be manually disposed
  // when you are done using it
  result.dispose()

  const camera = new THREE.PerspectiveCamera()
  camera.position.z = 3
  renderer.render(scene, camera)
}
