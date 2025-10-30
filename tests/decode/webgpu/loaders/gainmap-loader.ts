import * as decode from '@monogrid/gainmap-js/decode/webgpu'
import * as THREE from 'three/webgpu'
/**
 *
 * @param args
 */
export const testGainMapLoaderInBrowserWebGPU = (args: { sdr: string, gainmap: string, metadata: string, exposure?: number, sync?: boolean, maxDisplayBoost?: number }) => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise<void>(async (resolve, reject) => {
    const renderer = new THREE.WebGPURenderer()
    await renderer.init()
    renderer.toneMapping = THREE.LinearToneMapping
    renderer.toneMappingExposure = args.exposure || 1

    document.body.append(renderer.domElement)
    renderer.setSize(window.innerWidth, window.innerHeight)

    const loader = new decode.GainMapLoader(renderer)

    const onLoadingDone = async (result: decode.QuadRenderer<1016, decode.GainMapDecoderMaterial>) => {
      if (args.maxDisplayBoost) {
        result.material.maxDisplayBoost = args.maxDisplayBoost
        await result.render()
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

      const bgTexture = await result.toDataTexture({
        mapping: THREE.EquirectangularReflectionMapping,
        minFilter: THREE.LinearFilter,
        generateMipmaps: false
      })
      scene.background = bgTexture
      bgTexture.needsUpdate = true

      // result must be manually disposed
      // when you are done using it
      result.dispose()

      const camera = new THREE.PerspectiveCamera()
      camera.position.z = 3
      await renderer.renderAsync(scene, camera)

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
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(e)
        return
      }
      await onLoadingDone(result)
    } else {
      loader.load(
        [
          args.sdr,
          args.gainmap,
          args.metadata
        ],
        result => onLoadingDone(result),
        (evt: ProgressEvent) => {
          console.log('loading', evt.loaded, 'of', evt.total)
        }
      )
    }
  })
}
