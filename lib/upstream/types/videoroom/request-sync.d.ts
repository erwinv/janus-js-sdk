import { BaseMessage } from './'

interface VideoroomDestroyRequest {
  request: 'destroy'
}

interface VideoroomDestroyedMessage extends BaseMessage {
  videoroom: 'destroyed'
}
