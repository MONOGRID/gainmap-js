import * as encode from '@monogrid/gainmap-js/encode'
import * as libultrahdr from '@monogrid/gainmap-js/libultrahdr'
import * as workerInterface from '@monogrid/gainmap-js/worker-interface'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'

/**
 * evaluated inside browser
 *
 * @param args
 * @returns
 */
export const encodeAndCompressInBrowser = async (args: Omit<encode.EncodingParametersWithCompression, 'image' | 'maxContentBoost' | 'mimeType' | 'quality' | 'withWorker'> & { file: string, maxContentBoost?: number, mimeType?: encode.CompressionMimeType, quality?: number, withWorker?: boolean }) => {
  let withWorker
  if (args.withWorker) {
    withWorker = workerInterface.getWorkerInterface(
      workerInterface.getPromiseWorker(
        new Worker('../dist/worker.umd.cjs')
      )
    )
  }

  // load an HDR file
  const image = await new EXRLoader().loadAsync(args.file)

  // Encode the gainmap
  const encodingResult = await encode.encodeAndCompress({
    image,
    toneMapping: args.toneMapping,
    gamma: args.gamma,
    minContentBoost: args.minContentBoost,
    offsetHdr: args.offsetHdr,
    offsetSdr: args.offsetSdr,
    renderTargetOptions: args.renderTargetOptions,
    maxContentBoost: args.maxContentBoost || Math.max.apply(this, encode.findTextureMinMax(image)),
    mimeType: args.mimeType || 'image/jpeg',
    quality: args.quality || 0.9,
    flipY: args.flipY !== undefined ? args.flipY : true,
    withWorker
  })

  // embed the compressed images + metadata into a single
  // JPEG file
  const jpeg = await libultrahdr.encodeJPEGMetadata({
    ...encodingResult,
    sdr: encodingResult.sdr,
    gainMap: encodingResult.gainMap
  })

  return Array.from(jpeg)
}
