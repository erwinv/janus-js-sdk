import {
  AudioCodec,
  VideoCodec,
  StreamId,
  PluginHandle,
  JSEP,
  PluginMessageCallback,
} from './janus-core'

type IStream = {
  type: 'audio' | 'video' | 'data' | ''
  mindex: number
  mid: StreamId
  // feed_id
  disabled?: boolean

  description?: string
  moderated?: boolean
}

interface DisabledStream extends IStream {
  disabled: true
  description: undefined
  moderated: undefined
}

interface AudioStream extends IStream {
  type: 'audio'
  codec: 'none' | AudioCodec
  talking?: boolean
}

interface VideoStream extends IStream {
  type: 'video'
  codec: 'none' | VideoCodec
  simulcast?: boolean
  svc?: boolean
}

type Stream = DisabledStream | AudioStream | VideoStream

interface Publisher {
  id: string
  display: string
  streams: Stream[]
}

interface VideoroomJoinRequest {
  request: 'join'
}
interface VideoroomDestroyRequest {
  request: 'destroy'
}
interface VideoroomStartRequest {
  request: 'start'
}

type VideoroomRequest =
  | VideoroomJoinRequest
  | VideoroomDestroyRequest
  | VideoroomStartRequest

type VideoroomRequestName = VideoroomRequest['request']

interface BaseMessage {
  leaving?: unknown
  unpublished?: unknown
  error?: unknown
  error_code?: number
  audio_codec?: AudioCodec
  video_codec?: VideoCodec
}

interface VideoroomJoinedMessage extends BaseMessage {
  videoroom: 'joined'
  id: string
  private_id: string
  publishers?: Publisher[]
}

interface VideoroomDestroyedMessage extends BaseMessage {
  videoroom: 'destroyed'
}

interface VideoroomEventMessage extends BaseMessage {
  videoroom: 'event'
  streams?: Stream[] // update on own streams; OR
  publishers?: Publisher[] // newly added publishers' streams
  leaving?: Publisher['id']
  unpublished?: Publisher['id']
  substream?: 0 | 1 | 2
  temporal?: 0 | 1 | 2
}

interface VideoroomAttachedMessage extends BaseMessage {
  videoroom: 'attached'
}

interface VideoroomStartedMessage extends VideoroomEventMessage {
  started: 'ok'
}

interface VideoroomUpdatedMessage extends BaseMessage {
  videoroom: 'updated'
}

// export interface StreamingMessage extends BaseMessage {
//   streaming: "todofixme";
// }

type VideoroomMessage =
  | VideoroomJoinedMessage
  | VideoroomDestroyedMessage
  | VideoroomEventMessage
  | VideoroomAttachedMessage

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

interface VideoroomPluginHandle extends PluginHandle {
  plugin: 'janus.plugin.videoroom'

  send<R extends VideoroomRequestName>(
    payload: VideoroomRequestMessage<R> &
      VideoroomResponseCallback<R> & { jsep?: JSEP }
  ): void

  set onmessage(cb: PluginMessageCallback<'janus.plugin.videoroom'>)
}
