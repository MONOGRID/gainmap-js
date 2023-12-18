import * as decode from '@monogrid/gainmap-js'
import * as THREE from 'three'
/**
 *
 * @param args
 */
export const testGainMapLoaderInBrowser = (args: { sdr: string, gainmap: string, metadata: string, exposure?:number, sync?: boolean } & Partial<decode.GainmapDecodingParameters>) => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise<void>(async (resolve, reject) => {
    const renderer = new THREE.WebGLRenderer()
    renderer.toneMapping = THREE.LinearToneMapping
    renderer.toneMappingExposure = args.exposure || 1

    document.body.append(renderer.domElement)
    renderer.setSize(window.innerWidth, window.innerHeight)
    const loader = new decode.GainMapLoader(renderer)

    const onLoadingDone = (result: decode.QuadRenderer<1016, decode.GainMapDecoderMaterial>) => {
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

      resolve()
    }

    if (!args.sync) {
      let result: decode.QuadRenderer<1016, decode.GainMapDecoderMaterial>
      try {
        result = await loader.loadAsync([
          args.sdr,
          args.gainmap,
          args.metadata
        ])
      } catch (e) {
        reject(e)
        return
      }
      onLoadingDone(result)
    } else {
      loader.load(
        [
          args.sdr,
          args.gainmap,
          args.metadata
        ],
        result => onLoadingDone(result),
        (evt) => {
          console.log('loading', evt.loaded, 'of', evt.total)
        }
      )
    }
  })
}
