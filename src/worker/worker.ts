/* eslint-disable no-case-declarations */
// @ts-expect-error untyped lib
import registerPromiseWorker from 'promise-worker-transferable/register'

import { encodeBuffers } from '../encode-utils/encode-buffers'
import { WithTranferListFunction, WorkerInterface, WorkerRequest } from './worker-types'

const encodeGainmapBuffers = (message: WorkerInterface['encodeGainmapBuffers']['request'], withTransferList: WithTranferListFunction): WorkerInterface['encodeGainmapBuffers']['result'] => {
  const result = encodeBuffers(message.payload)
  return withTransferList({
    ...result,
    hdr: message.payload.hdr,
    sdr: message.payload.sdr
  }, [result.gainMap.buffer, message.payload.hdr.buffer, message.payload.sdr.buffer])
}

registerPromiseWorker(async (message: WorkerRequest, withTransferList: WithTranferListFunction) => {
  switch (message.type) {
    case 'encode-gainmap-buffers':
      return encodeGainmapBuffers(message, withTransferList)
  }
})
