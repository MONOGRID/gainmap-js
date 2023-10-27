// @ts-expect-error untyped lib
import registerPromiseWorker from 'promise-worker-transferable/register'

import { compress } from '../encode-utils/compress'
import { encodeBuffers } from '../encode-utils/encode-buffers'
import { type WithTranferListFunction, type WorkerInterface, type WorkerRequest } from './worker-types'

const encodeGainmapBuffers = (message: WorkerInterface['encodeGainmapBuffers']['request'], withTransferList: WithTranferListFunction): WorkerInterface['encodeGainmapBuffers']['result'] => {
  const result = encodeBuffers(message.payload)
  return withTransferList({
    ...result,
    hdr: message.payload.hdr,
    sdr: message.payload.sdr
  }, [result.gainMap.buffer, message.payload.hdr.buffer, message.payload.sdr.buffer])
}

const _compress = async (message: WorkerInterface['compress']['request'], withTransferList: WithTranferListFunction): Promise<WorkerInterface['compress']['result']> => {
  const result = await compress(message.payload)
  return withTransferList({
    ...result,
    source: message.payload.source instanceof ImageData ? message.payload.source.data : new Uint8ClampedArray(message.payload.source)
  }, [result.data.buffer, message.payload.source instanceof ImageData ? message.payload.source.data.buffer : message.payload.source.buffer])
}

registerPromiseWorker(async (message: WorkerRequest, withTransferList: WithTranferListFunction) => {
  switch (message.type) {
    case 'encode-gainmap-buffers':
      return encodeGainmapBuffers(message, withTransferList)
    case 'compress':
      return _compress(message, withTransferList)
  }
})
