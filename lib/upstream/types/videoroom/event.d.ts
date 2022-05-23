import { Attendee, Publisher } from '.'

export interface VideoroomEvent {
  videoroom: 'event'
  room: number
}

export interface VideoroomJoiningEvent extends VideoroomEvent {
  joining: Attendee
}

export interface VideoroomPublishersEvent extends VideoroomEvent {
  publishers: Publisher[]
}

export interface VideoroomUnpublishedEvent extends VideoroomEvent {
  unpublished: Publisher['id']
}
