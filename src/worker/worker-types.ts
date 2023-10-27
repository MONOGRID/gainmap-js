import { CompressedImage, type CompressParameters, type EncodeBuffersParameters, type EncodeBuffersResult } from '../types'

export type WorkerInterface = {
  encodeGainmapBuffers: {
    request: {
      type: 'encode-gainmap-buffers',
      payload: EncodeBuffersParameters
    }
    result: EncodeBuffersResult & { sdr: EncodeBuffersParameters['sdr'], hdr: EncodeBuffersParameters['hdr'] }
  },
  compress: {
    request: {
      type: 'compress',
      payload: CompressParameters
    }
    result: Awaited<CompressedImage> & { source: Uint8ClampedArray }
  }
}

/**
 * Transferable
 */
export type Transferable = ArrayBufferLike | ImageBitmap

export type WorkerInterfaceImplementation = {
  [k in keyof WorkerInterface]: (payload: WorkerInterface[k]['request']['payload']) => Promise<WorkerInterface[k]['result']>
}

export type WorkerRequest = WorkerInterface[keyof WorkerInterface]['request']

export type WithTranferListFunction = <T>(payload: T, transferList: Transferable[]) => T

export type PromiseWorkerType = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postMessage: (message: any, transferables?: Transferable[]) => Promise<any>
}
