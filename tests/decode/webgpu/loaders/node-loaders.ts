import * as decode from '@monogrid/gainmap-js/webgpu'
import * as THREE from 'three/webgpu'

export type NodeLoaderArgs = {
  /** a single url uses HDRJPGNodeLoader, three urls ([sdr, gainmap, metadata]) use GainMapNodeLoader */
  files: string | [string, string, string]
  exposure?: number
  maxDisplayBoost?: number
  /** use `load` with callbacks instead of `loadAsync` */
  sync?: boolean
}

/**
 * Renders the same scene as the legacy loader tests (see hdr-jpg-loader.ts and gainmap-loader.ts)
 * so the results can be compared against the same screenshots
 *
 * @param args
 */
export const testNodeLoaderInBrowser = async (args: NodeLoaderArgs) => {
  const renderer = new THREE.WebGPURenderer()
  await renderer.init()
  renderer.toneMapping = THREE.LinearToneMapping
  renderer.toneMappingExposure = args.exposure || 1
  document.body.append(renderer.domElement)
  renderer.setSize(window.innerWidth, window.innerHeight)

  const load = () => {
    if (typeof args.files === 'string') {
      const loader = new decode.HDRJPGNodeLoader()
      if (!args.sync) return loader.loadAsync(args.files)
      return new Promise<decode.GainMapNode>((resolve, reject) => {
        loader.load(args.files as string, resolve, (evt: ProgressEvent) => { console.log('loading', evt.loaded, 'of', evt.total) }, reject)
      })
    }
    const loader = new decode.GainMapNodeLoader()
    if (!args.sync) return loader.loadAsync(args.files)
    return new Promise<decode.GainMapNode>((resolve, reject) => {
      loader.load(args.files as [string, string, string], resolve, (evt: ProgressEvent) => { console.log('loading', evt.loaded, 'of', evt.total) }, reject)
    })
  }

  const hdr = await load()

  if (args.maxDisplayBoost) hdr.maxDisplayBoost.value = args.maxDisplayBoost

  const scene = new THREE.Scene()
  const material = new THREE.MeshBasicNodeMaterial()
  material.colorNode = hdr
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(), material)
  const ratio = hdr.width / hdr.height
  plane.scale.y = Math.min(1, 1 / ratio)
  plane.scale.x = Math.min(1, ratio)
  scene.add(plane)

  // the texture alone isn't part of a node graph, decode explicitly before it's converted for the background
  hdr.decode(renderer)
  hdr.value.mapping = THREE.EquirectangularReflectionMapping
  scene.background = hdr.value

  const camera = new THREE.PerspectiveCamera()
  camera.position.z = 3
  renderer.render(scene, camera)
}

/**
 * Decodes the same files with the legacy (QuadRenderer based) loader and the node loader,
 * returns the relative difference between the two HDR results
 *
 * @param args
 */
export const compareNodeLoaderWithLegacyInBrowser = async (args: NodeLoaderArgs) => {
  const renderer = new THREE.WebGPURenderer()
  await renderer.init()

  const legacy = typeof args.files === 'string'
    ? await new decode.HDRJPGLoader(renderer).loadAsync(args.files)
    : await new decode.GainMapLoader(renderer).loadAsync(args.files)
  const hdr = typeof args.files === 'string'
    ? await new decode.HDRJPGNodeLoader().loadAsync(args.files)
    : await new decode.GainMapNodeLoader().loadAsync(args.files)

  if (args.maxDisplayBoost) {
    legacy.material.maxDisplayBoost = args.maxDisplayBoost
    await legacy.render()
    hdr.maxDisplayBoost.value = args.maxDisplayBoost
  }
  hdr.decode(renderer)

  const width = hdr.renderTarget.width
  const height = hdr.renderTarget.height
  const a = await renderer.readRenderTargetPixelsAsync(legacy.renderTarget, 0, 0, width, height) as Uint16Array
  const b = await renderer.readRenderTargetPixelsAsync(hdr.renderTarget, 0, 0, width, height) as Uint16Array

  let maxRelativeDifference = 0
  for (let i = 0; i < a.length; i++) {
    // skip alpha
    if (i % 4 === 3) continue
    const x = THREE.DataUtils.fromHalfFloat(a[i])
    const y = THREE.DataUtils.fromHalfFloat(b[i])
    maxRelativeDifference = Math.max(maxRelativeDifference, Math.abs(x - y) / Math.max(1e-3, Math.abs(x)))
  }

  legacy.dispose()
  hdr.dispose()
  await renderer.dispose()

  return { width, height, legacyWidth: legacy.width, legacyHeight: legacy.height, maxRelativeDifference }
}

/**
 * Renders a few frames, changes a uniform, renders a few more frames
 * and returns how many times the image was decoded in each phase
 *
 * @param args
 */
export const countNodeDecodesInBrowser = async (args: NodeLoaderArgs) => {
  const renderer = new THREE.WebGPURenderer()
  await renderer.init()
  renderer.setSize(64, 64)

  const hdr = typeof args.files === 'string'
    ? await new decode.HDRJPGNodeLoader().loadAsync(args.files)
    : await new decode.GainMapNodeLoader().loadAsync(args.files)

  let decodes = 0
  const decodeImpl = hdr.decode.bind(hdr)
  hdr.decode = (r: THREE.WebGPURenderer) => {
    const decoded = decodeImpl(r)
    if (decoded) decodes++
    return decoded
  }

  const scene = new THREE.Scene()
  const material = new THREE.MeshBasicNodeMaterial()
  material.colorNode = hdr
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), material))
  const camera = new THREE.PerspectiveCamera()
  camera.position.z = 3

  const phases: { decodes: number, pmremVersion: number }[] = []
  const renderFrames = (frames: number) => {
    decodes = 0
    for (let i = 0; i < frames; i++) renderer.render(scene, camera)
    phases.push({ decodes, pmremVersion: hdr.value.pmremVersion })
  }

  renderFrames(10)
  renderFrames(10)
  hdr.maxDisplayBoost.value = 2
  renderFrames(10)
  renderFrames(10)

  hdr.dispose()
  await renderer.dispose()
  return phases
}
