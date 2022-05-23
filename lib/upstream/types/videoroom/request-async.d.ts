import { Publisher, Attendee, VideoroomEvent } from './event'
import { AudioCodec, StreamId, VideoCodec } from '../core'

// join

export interface VideoroomJoinRequest {
  request: 'join'
  ptype: 'publisher' | 'subscriber'
  id?: number // TODO confirm number
  display?: string
  pin?: string
  token?: string
}

export interface VideoroomJoined {
  videoroom: 'joined'
  room: number
  description: string
  id: number
  private_id: string
  publishers: Publisher[]
  attendees?: Attendee[]
}

// joinandconfigure
// configure

export interface VideoroomConfigureRequest {
  request: 'configure'
  bitrate?: number
  keyframe
  record
  filename
  display
  audio_active_packets
  audio_level_average
  mid
  send
  min_delay
  max_delay
  descriptions
}

export interface VideoroomConfigured extends VideoroomEvent {
  configured: 'ok'
}

// publish

export interface VideoroomPublishRequest {
  request: 'publish'
  audiocodec?: AudioCodec
  videocodec?: VideoCodec
  bitrate?: number
  record?: boolean
  filename?: string
  display?: string
  audio_level_average?: number // TODO confirm number
  audio_active_packets?: number // TODO confirm number
  descriptions: Array<{
    mid: StreamId
    description: string
  }>
}

export interface VideoroomPublished extends VideoroomEvent {
  configured: 'ok'
}

// unpublish

export interface VideoroomUnpublishRequest {
  request: 'unpublish'
}

export interface VideoroomUnpublished extends VideoroomEvent {
  unpublished: 'ok'
}

// start

export interface VideoroomStartRequest {
  request: 'start'
}

// pause
// switch
// leave

export type VideoroomAsyncRequest = VideoroomJoinRequest | VideoroomStartRequest
