import { AudioCodec, VideoCodec, StreamId } from '../core'

export interface BaseMessage {
  leaving?: unknown
  unpublished?: unknown
  error?: unknown
  error_code?: number
  audio_codec?: AudioCodec
  video_codec?: VideoCodec
}

type IStream = {
  type: 'audio' | 'video' | 'data'
  mindex: number
  mid: StreamId
  // feed_id

  description?: string
  moderated?: boolean
}

export interface AudioStream extends IStream {
  type: 'audio'
  codec: 'none' | AudioCodec
  talking?: boolean
}

export interface VideoStream extends IStream {
  type: 'video'
  codec: 'none' | VideoCodec
  simulcast?: boolean
  svc?: boolean
}

export interface DataStream extends IStream {
  type: 'data'
}

export type Stream = AudioStream | VideoStream | DataStream

export interface DisabledStream extends Stream {
  disabled: true
  description: undefined
  moderated: undefined
}

export interface Publisher {
  id: string
  display: string
  streams: Stream[]
}

export type Attendee = Pick<Publisher, 'id' | 'display'>

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

type VideoroomMessage =
  | VideoroomJoinedMessage
  | VideoroomDestroyedMessage
  | VideoroomEventMessage
  | VideoroomAttachedMessage
