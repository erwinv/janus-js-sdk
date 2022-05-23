import { AudioCodec, VideoCodec } from '../core'

// create

interface VideoroomCreateRequest {
  request: 'create'
  room: number
  permanent?: boolean
  description?: string
  is_private?: boolean
  secret?: string
  pin?: string
  require_pvtid?: boolean
  signed_tokens?: boolean
  publishers: number
  bitrate: number
  bitrate_cap?: boolean
  fir_freq: number
  audiocodec?: UnionConcat<AudioCodec, ','>
  videocodec?: UnionConcat<VideoCodec, ','>
  vp9_profile?: string
  h264_profile?: string
  opus_fec?: boolean
  opus_dtx?: boolean
  video_svc?: boolean
  audiolevel_ext?: boolean
  audiolevel_event?: boolean
  audio_active_packets?: number
  audio_level_average?: number
  videoorient_ext?: boolean
  playoutdelay_ext?: boolean
  transport_wide_cc_ext?: boolean
  record?: boolean
  rec_dir?: string
  lock_record?: boolean
  notify_joining?: boolean
  require_e2ee?: boolean
  allowed?: string[]
}

interface VideoroomCreated {
  videoroom: 'created'
  room: number
  permanent: boolean
}

interface VideoroomCreateFailed {
  videoroom: 'event'
  error_code: number
  error: string
}

type VideoroomCreateResponse = VideoroomCreated | VideoroomCreateFailed

// destroy

interface VideoroomDestroyRequest {
  request: 'destroy'
}

interface VideoroomDestroyedMessage {
  videoroom: 'destroyed'
}

// edit

interface VideoroomEditRequest {
  request: 'edit'
  room: number
  secret: string
  new_description: string
  new_secret?: string
  new_pin: string
  new_is_private: boolean
  new_require_pvtid: boolean
  new_bitrate: number
  new_fir_freq: number
  new_publishers: number
  new_lock_record: boolean
  new_rec_dir: string
  permanent: boolean
}

interface VideoroomEdited {
  videoroom: 'edited'
  room: number
}

type VideoroomEditResponse = VideoroomEdited

// list
// allowed
// kick
// moderate
// enable_recording
// listparticipants
// listforwarders
