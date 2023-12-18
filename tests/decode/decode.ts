import * as decode from '@monogrid/gainmap-js'
import * as THREE from 'three'
/**
 * test evaluated inside browser
 *
 * @param args
 * @returns
 */
export const decodeInBrowser = async (args: { file: string }) => {
  const renderer = new THREE.WebGLRenderer()
  document.body.append(renderer.domElement)
  renderer.setSize(window.innerWidth, window.innerHeight)

  // fetch a JPEG image containing a gainmap as ArrayBuffer
  const file = await fetch(args.file)
  const fileBuffer = await file.arrayBuffer()
  const jpeg = new Uint8Array(fileBuffer)

  // extract data from the JPEG
  const { gainMap: gainMapBuffer, sdr: sdrBuffer, metadata } = await decode.extractGainmapFromJPEG(jpeg)

  // create data blobs
  const gainMapBlob = new Blob([gainMapBuffer], { type: 'image/jpeg' })
  const sdrBlob = new Blob([sdrBuffer], { type: 'image/jpeg' })

  // create ImageBitmap data
  const [gainMapImageBitmap, sdrImageBitmap] = await Promise.all([
    createImageBitmap(gainMapBlob, { imageOrientation: 'flipY' }),
    createImageBitmap(sdrBlob, { imageOrientation: 'flipY' })
  ])

  const gainMap = new THREE.Texture(gainMapImageBitmap)
  gainMap.needsUpdate = true

  const sdr = new THREE.Texture(sdrImageBitmap)
  sdr.needsUpdate = true

  // restore the HDR texture
  const result = decode.decode({
    sdr,
    gainMap,
    renderer,
    maxDisplayBoost: Math.pow(2, metadata.hdrCapacityMax),
    ...metadata
  })

  const scene = new THREE.Scene()

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(),
    new THREE.MeshBasicMaterial({ map: result.renderTarget.texture })
  )
  const ratio = result.width / result.height
  plane.scale.y = Math.min(1, 1 / ratio)
  plane.scale.x = Math.min(1, ratio)

  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5)
  camera.position.z = 10

  scene.add(plane)
  renderer.render(scene, camera)

  result.dispose()

  return {
    jpeg: Array.from(jpeg),
    materialValues: {
      sdr: result.material.sdr.toJSON(),
      gainMap: result.material.gainMap.toJSON(),
      offsetHdr: result.material.offsetHdr,
      offsetSdr: result.material.offsetSdr,
      gainMapMin: result.material.gainMapMin,
      gainMapMax: result.material.gainMapMax,
      gamma: result.material.gamma,
      hdrCapacityMin: result.material.hdrCapacityMin,
      hdrCapacityMax: result.material.hdrCapacityMax,
      maxDisplayBoost: result.material.maxDisplayBoost
    }
  }
}
