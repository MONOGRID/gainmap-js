// @ts-expect-error untyped lib
import registerPromiseWorker from 'promise-worker-transferable/register'

import { compress } from './encode/compress'
import { type WithTransferListFunction, type WorkerInterface, type WorkerRequest } from './worker-types'

const _compress = async (message: WorkerInterface['compress']['request'], withTransferList: WithTransferListFunction): Promise<WorkerInterface['compress']['result']> => {
  const result = await compress(message.payload)
  return withTransferList({
    ...result,
    source: message.payload.source instanceof ImageData ? message.payload.source.data : new Uint8ClampedArray(message.payload.source)
  }, [result.data.buffer, message.payload.source instanceof ImageData ? message.payload.source.data.buffer : message.payload.source.buffer])
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
registerPromiseWorker(async (message: WorkerRequest, withTransferList: WithTransferListFunction) => {
  switch (message.type) {
    // case 'encode-gainmap-buffers':
    //   return encodeGainmapBuffers(message, withTransferList)
    case 'compress':
      return _compress(message, withTransferList)
  }
})
