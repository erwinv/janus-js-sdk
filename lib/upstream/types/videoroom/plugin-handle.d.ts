import { PluginHandle, JSEP, PluginMessageCallback } from '../core'

interface VideoroomRequestMap {
  join: VideoroomJoinRequest
  start: VideoroomStartRequest
  destroy: VideoroomDestroyRequest
}

interface VideoroomRequestMessage<R extends VideoroomRequestName> {
  message: { request: R } & VideoroomRequestMap[R]
}

interface VideoroomResponseMap {
  join: VideoroomJoinedMessage
  start: VideoroomStartedMessage
  destroy: VideoroomDestroyedMessage
}

interface VideoroomResponseCallback<R extends VideoroomRequestName> {
  success?: (val?: VideoroomResponseMap[R]) => void
  error?: ErrorCallback
}

type VideoroomRequest =
  | VideoroomJoinRequest
  | VideoroomDestroyRequest
  | VideoroomStartRequest

type VideoroomRequestName = VideoroomRequest['request']

interface VideoroomPluginHandle extends PluginHandle {
  plugin: 'janus.plugin.videoroom'

  send<R extends VideoroomRequestName>(
    payload: VideoroomRequestMessage<R> &
      VideoroomResponseCallback<R> & { jsep?: JSEP }
  ): void

  set onmessage(cb: PluginMessageCallback<'janus.plugin.videoroom'>)
}
