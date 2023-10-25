import { type encodeBuffers } from '../encode-utils/encode-buffers'
import { type EncodeBuffersParameters } from '../types'

export type WorkerInterface = {
  encodeGainmapBuffers: {
    request: {
      type: 'encode-gainmap-buffers',
      payload: EncodeBuffersParameters
    }
    result: ReturnType<typeof encodeBuffers> & { sdr: Uint8ClampedArray, hdr: Uint8Array | Uint8ClampedArray | Float32Array | Uint16Array }
  }
}

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
