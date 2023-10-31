// @ts-expect-error untyped lib
import PromiseWorker from 'promise-worker-transferable'

import { type PromiseWorkerType, type WorkerInterface, type WorkerInterfaceImplementation } from './worker-types'

export * from './worker-types'
/**
 *
 * @param worker
 * @returns
 */
export const getPromiseWorker = (worker: Worker) => {
  return new PromiseWorker(worker) as PromiseWorkerType
}
/**
 *
 * @param worker
 * @returns
 */
export const getWorkerInterface = (worker: PromiseWorkerType): WorkerInterfaceImplementation => {
  return {
    // encodeGainmapBuffers: (payload: WorkerInterface['encodeGainmapBuffers']['request']['payload']) => worker.postMessage({ type: 'encode-gainmap-buffers', payload } as WorkerInterface['encodeGainmapBuffers']['request']),
    compress: (payload: WorkerInterface['compress']['request']['payload']) => worker.postMessage({ type: 'compress', payload } as WorkerInterface['compress']['request'])
  }
}
