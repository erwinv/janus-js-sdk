interface VideoroomJoinRequest {
  request: 'join'
}

interface VideoroomStartRequest {
  request: 'start'
}

type VideoroomAsyncRequest = VideoroomJoinRequest | VideoroomStartRequest

interface VideoroomJoinedMessage extends BaseMessage {
  videoroom: 'joined'
  id: string
  private_id: string
  publishers?: Publisher[]
}
