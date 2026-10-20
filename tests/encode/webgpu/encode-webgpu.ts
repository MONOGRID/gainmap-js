import * as encode from '@monogrid/gainmap-js/encode'
import * as encodeWebGPU from '@monogrid/gainmap-js/encode/webgpu'
import * as libultrahdr from '@monogrid/gainmap-js/libultrahdr'
import * as decode from '@monogrid/gainmap-js/webgpu'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import * as THREE from 'three/webgpu'

export type EncoderParityArgs = Partial<encode.GainmapEncodingParameters> & {
  file: string
  toneMapping?: THREE.ToneMapping
  exposure?: number
  brightness?: number
  contrast?: number
  saturation?: number
  /** use the WebGL backend of the WebGPURenderer */
  forceWebGL?: boolean
  /** change the parameters after a first render, to test live updates */
  changeAfterFirstRender?: boolean
}

/**
 * Encodes the same file with the legacy (WebGL) encoder and the node (WebGPU) encoder,
 * returns the differences between the raw results
 *
 * @param args
 */
export const compareEncodersInBrowser = async (args: EncoderParityArgs) => {
  const image = await new EXRLoader().loadAsync(args.file)

  const legacyMax = encode.findTextureMinMax(image, 'max')
  const legacyMin = encode.findTextureMinMax(image, 'min')
  const maxContentBoost = args.maxContentBoost ?? Math.max(...legacyMax)

  const params = {
    maxContentBoost,
    minContentBoost: args.minContentBoost,
    gamma: args.gamma,
    offsetHdr: args.offsetHdr,
    offsetSdr: args.offsetSdr
  }

  // legacy encoder
  const legacy = encode.encode({ ...params, image, toneMapping: args.toneMapping })
  if (args.exposure !== undefined) legacy.sdr.material.exposure = args.exposure
  if (args.brightness !== undefined) legacy.sdr.material.brightness = args.brightness
  if (args.contrast !== undefined) legacy.sdr.material.contrast = args.contrast
  if (args.saturation !== undefined) legacy.sdr.material.saturation = args.saturation
  legacy.sdr.render()
  // read the SDR back before the gain map samples it again: on SwiftShader, reading
  // a render target that was re-rendered after being sampled returns the previous content
  const legacySDR = legacy.sdr.toArray()
  legacy.gainMap.render()
  const legacyGainMap = legacy.gainMap.toArray()
  const legacyMetadata = legacy.getMetadata()
  const { width, height } = legacy.sdr
  const gl = legacy.sdr.renderer.getContext()
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
  const rendererName = String(debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
  const softwareRenderer = /SwiftShader|llvmpipe/i.test(rendererName)
  legacy.sdr.dispose()
  legacy.gainMap.dispose()

  // node encoder
  const renderer = new THREE.WebGPURenderer({ forceWebGL: args.forceWebGL })
  await renderer.init()

  let encoder: encodeWebGPU.GainMapEncoder
  if (args.changeAfterFirstRender) {
    // render once with default parameters, then change them: only the uniforms are updated
    encoder = new encodeWebGPU.GainMapEncoder(image, { maxContentBoost: 2 })
    await encoder.read(renderer)
    encoder.sdr.setToneMapping(args.toneMapping ?? THREE.ACESFilmicToneMapping)
    encoder.gainMap.maxContentBoost.value = maxContentBoost
    if (args.minContentBoost !== undefined) encoder.gainMap.minContentBoost.value = args.minContentBoost
    if (args.gamma !== undefined) encoder.gainMap.gamma.value.fromArray(args.gamma)
    if (args.offsetHdr !== undefined) encoder.gainMap.offsetHdr.value.fromArray(args.offsetHdr)
    if (args.offsetSdr !== undefined) encoder.gainMap.offsetSdr.value.fromArray(args.offsetSdr)
  } else {
    encoder = new encodeWebGPU.GainMapEncoder(image, { ...params, toneMapping: args.toneMapping })
  }
  if (args.exposure !== undefined) encoder.sdr.exposure.value = args.exposure
  if (args.brightness !== undefined) encoder.sdr.brightness.value = args.brightness
  if (args.contrast !== undefined) encoder.sdr.contrast.value = args.contrast
  if (args.saturation !== undefined) encoder.sdr.saturation.value = args.saturation

  const result = await encoder.read(renderer)

  // ground truth of min and max values
  const cpuMax = [0, 0, 0]
  const cpuMin = [65504, 65504, 65504]
  const data = image.image.data as Uint16Array | Float32Array
  for (let i = 0; i < data.length; i++) {
    const channel = i % 4
    if (channel === 3) continue
    const value = data instanceof Uint16Array ? THREE.DataUtils.fromHalfFloat(data[i]) : data[i]
    cpuMax[channel] = Math.max(cpuMax[channel], value)
    cpuMin[channel] = Math.min(cpuMin[channel], value)
  }

  const webgpuMax = await encodeWebGPU.findTextureMinMax(image, 'max', renderer)
  const webgpuMin = await encodeWebGPU.findTextureMinMax(image, 'min', renderer)

  // WebGL reads rows bottom to top, the node encoder returns them top to bottom
  const compare = (legacyData: Uint8ClampedArray, data: Uint8ClampedArray) => {
    let maxDifference = 0
    let differentValues = 0
    for (let y = 0; y < height; y++) {
      const legacyRow = (height - 1 - y) * width * 4
      const row = y * width * 4
      for (let i = 0; i < width * 4; i++) {
        const difference = Math.abs(legacyData[legacyRow + i] - data[row + i])
        if (difference > 0) differentValues++
        maxDifference = Math.max(maxDifference, difference)
      }
    }
    return { maxDifference, differentValues, totalValues: width * height * 4 }
  }

  const output = {
    softwareRenderer,
    width: result.sdr.width,
    height: result.sdr.height,
    legacyWidth: width,
    legacyHeight: height,
    sdr: compare(legacySDR, result.sdr.data),
    // average SDR value, for tone mappings which don't match the WebGL encoder
    sdrMean: result.sdr.data.reduce((sum, v, i) => i % 4 === 3 ? sum : sum + v, 0) / (result.sdr.width * result.sdr.height * 3),
    gainMap: compare(legacyGainMap, result.gainMap.data),
    metadata: result.metadata,
    legacyMetadata,
    legacyMax,
    webgpuMax,
    legacyMin,
    webgpuMin,
    cpuMax,
    cpuMin
  }

  encoder.dispose()
  await renderer.dispose()
  return output
}

/**
 * Renders a scene using the encoder nodes, changes parameters between frames
 * and returns how many times each node rendered in each phase
 *
 * @param args
 */
export const countEncoderRendersInBrowser = async (args: { file: string }) => {
  const image = await new EXRLoader().loadAsync(args.file)
  const renderer = new THREE.WebGPURenderer()
  await renderer.init()
  renderer.setSize(64, 64)

  const encoder = new encodeWebGPU.GainMapEncoder(image, { maxContentBoost: 4 })
  const preview = encoder.createPreviewNode()

  const scene = new THREE.Scene()
  const nodes = [encoder.sdr, encoder.gainMap, preview]
  nodes.forEach((node, i) => {
    const material = new THREE.MeshBasicNodeMaterial()
    material.colorNode = node
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(), material)
    mesh.position.x = i - 1
    scene.add(mesh)
  })
  const camera = new THREE.PerspectiveCamera()
  camera.position.z = 3

  const phases: { sdr: number, gainMap: number, preview: number }[] = []
  const renderFrames = (frames: number) => {
    const revisions = nodes.map(node => node.revision)
    for (let i = 0; i < frames; i++) renderer.render(scene, camera)
    const [sdr, gainMap, previewRenders] = nodes.map((node, i) => node.revision - revisions[i])
    phases.push({ sdr, gainMap, preview: previewRenders })
  }

  renderFrames(5) // first render
  renderFrames(5) // nothing changed
  encoder.gainMap.gamma.value.setScalar(1.2)
  renderFrames(5) // only the gain map (and the preview) render again
  encoder.sdr.exposure.value = 0.5
  renderFrames(5) // everything renders again
  encoder.sdr.setToneMapping(THREE.LinearToneMapping)
  renderFrames(5) // everything renders again
  preview.maxDisplayBoost.value = 2
  renderFrames(5) // only the preview renders again

  const metadataFollowed = preview.gamma.value.x === 1.2

  encoder.dispose()
  preview.dispose()
  await renderer.dispose()
  return { phases, metadataFollowed }
}

/**
 * Encodes the same image from a texture, from raw texture data and from a generic node,
 * returns whether the results are identical
 *
 * @param args
 */
export const compareEncoderInputsInBrowser = async (args: { file: string }) => {
  const image = await new EXRLoader().loadAsync(args.file)
  const renderer = new THREE.WebGPURenderer()
  await renderer.init()

  const { width, height } = image.image
  const fromTexture = new encodeWebGPU.GainMapEncoder(image, { maxContentBoost: 4 })
  const fromData = new encodeWebGPU.GainMapEncoder({ data: image.image.data as Uint16Array, width, height, type: image.type }, { maxContentBoost: 4 })
  // a generic node: an HDR image scaled down and back up
  const node = THREE.TSL.texture(image).mul(0.5).mul(2)
  const fromNode = new encodeWebGPU.GainMapEncoder(node, { maxContentBoost: 4, width, height })

  let missingSizeError: string | undefined
  try {
    // eslint-disable-next-line no-new
    new encodeWebGPU.GainMapEncoder(node)
  } catch (e) {
    missingSizeError = (e as Error).message
  }

  const [a, b, c] = await Promise.all([fromTexture.read(renderer), fromData.read(renderer), fromNode.read(renderer)])
  const equal = (x: ImageData, y: ImageData) => x.data.length === y.data.length && x.data.every((v, i) => v === y.data[i])

  const nodeMax = await encodeWebGPU.findTextureMinMax(node, 'max', renderer, { width, height })
  const textureMax = await encodeWebGPU.findTextureMinMax(image, 'max', renderer)
  const fitted = await fromNode.fitMaxContentBoost(renderer)

  fromTexture.dispose()
  fromData.dispose()
  fromNode.dispose()
  await renderer.dispose()

  return {
    dataEqualsTexture: equal(a.sdr, b.sdr) && equal(a.gainMap, b.gainMap),
    nodeEqualsTexture: equal(a.sdr, c.sdr) && equal(a.gainMap, c.gainMap),
    missingSizeError,
    nodeMax,
    textureMax,
    fitted
  }
}

/**
 * Encodes and compresses an image into a JPEG with gain map, then extracts it again
 *
 * @param args
 */
export const encodeAndCompressInBrowser = async (args: { file: string, mimeType: encode.CompressionMimeType }) => {
  const image = await new EXRLoader().loadAsync(args.file)
  const renderer = new THREE.WebGPURenderer()
  await renderer.init()

  const encoder = new encodeWebGPU.GainMapEncoder(image)
  await encoder.fitMaxContentBoost(renderer)
  const result = await encoder.compress(renderer, { mimeType: args.mimeType, quality: 0.9 })

  const output = {
    metadata: encoder.metadata,
    sdr: { mimeType: result.sdr.mimeType, width: result.sdr.width, height: result.sdr.height },
    gainMap: { mimeType: result.gainMap.mimeType, width: result.gainMap.width, height: result.gainMap.height },
    jpeg: undefined as number[] | undefined,
    extractedMetadata: undefined as encode.GainMapMetadata | undefined
  }

  if (args.mimeType === 'image/jpeg') {
    const jpeg = libultrahdr.encodeJPEGMetadata(result)
    output.jpeg = Array.from(jpeg)
    output.extractedMetadata = (await decode.extractGainmapFromJPEG(jpeg)).metadata
  }

  encoder.dispose()
  await renderer.dispose()
  return output
}

/**
 * Encodes an image with a tone mapping, fitting the content boost range with
 * `fitMaxContentBoost` and `fitContentBoost`, then decodes it at full HDR capacity
 * and measures how far each reconstruction is from the original HDR image
 *
 * @param args
 */
export const measureReconstructionInBrowser = async (args: { file: string, toneMapping: THREE.ToneMapping }) => {
  const image = await new EXRLoader().loadAsync(args.file)
  const renderer = new THREE.WebGPURenderer()
  await renderer.init()

  const encoder = new encodeWebGPU.GainMapEncoder(image, { toneMapping: args.toneMapping })
  const { width, height } = encoder
  const renderTarget = new THREE.RenderTarget(width, height, { type: THREE.FloatType, depthBuffer: false })
  const quad = new THREE.QuadMesh(new THREE.MeshBasicNodeMaterial())
  const renderToFloat = async (node: THREE.Node) => {
    const material = new THREE.NodeMaterial()
    material.fragmentNode = node
    quad.material = material
    renderer.setRenderTarget(renderTarget)
    quad.render(renderer)
    renderer.setRenderTarget(null)
    const pixels = await renderer.readRenderTargetPixelsAsync(renderTarget, 0, 0, width, height) as Float32Array
    material.dispose()
    return pixels
  }

  const hdr = await renderToFloat(encoder.sdr.hdr)

  // mean and max error in stops, offsets avoid huge errors on black pixels
  const measure = async () => {
    encoder.render(renderer)
    const preview = encoder.createPreviewNode()
    preview.maxDisplayBoost.value = 2 ** encoder.metadata.hdrCapacityMax
    const decoded = await renderToFloat(preview)
    preview.dispose()
    let sum = 0
    let max = 0
    let count = 0
    for (let i = 0; i < hdr.length; i++) {
      if (i % 4 === 3) continue
      const error = Math.abs(Math.log2((decoded[i] + 1 / 64) / (hdr[i] + 1 / 64)))
      sum += error
      max = Math.max(max, error)
      count++
    }
    return { meanError: sum / count, maxError: max, metadata: encoder.metadata }
  }

  await encoder.fitMaxContentBoost(renderer)
  const fitMax = await measure()
  const range = await encoder.fitContentBoost(renderer)
  const fitContent = await measure()

  encoder.dispose()
  renderTarget.dispose()
  await renderer.dispose()
  return { fitMax, fitContent, range }
}
