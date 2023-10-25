// @ts-expect-error untyped lib
import PromiseWorker from 'promise-worker-transferable'

import { PromiseWorkerType, WorkerInterface, WorkerInterfaceImplementation } from '../worker/worker-types'
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
    encodeGainmapBuffers: (payload: WorkerInterface['encodeGainmapBuffers']['request']['payload']) => worker.postMessage({ type: 'encode-gainmap-buffers', payload } as WorkerInterface['encodeGainmapBuffers']['request'])
  }
}
