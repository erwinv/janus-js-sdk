import _ from 'lodash'
import {
  Property as DynamicVal,
  EventStream,
  once,
  never,
  constant,
} from 'baconjs'
import Janus, {
  Offer,
  Publisher,
  Stream,
  VideoroomEventMessage,
  VideoroomJoinedMessage,
} from '../upstream/janus.es'
import {
  attachToPlugin,
  createSession,
  negotiatePublisherSdp,
  sendRequest,
  destroySession,
  acceptSdpOffer,
  detachPlugin,
  PluginHandleWithObservableCallbacks,
  isJoinedResponse,
  isEventMessage,
} from '../core'

export default class JanusVideoroom {
  opaqueId: string
  publisherId: string = ''
  privateId: string = ''

  addedPublishers: EventStream<Publisher[]> = never()
  removedPublishers: EventStream<Publisher['id']> = never()
  addedLocalTracks: EventStream<MediaStreamTrack> = never()
  removedLocalTracks: EventStream<MediaStreamTrack> = never()
  addedRemoteTracks: EventStream<MediaStreamTrack> = never()
  removedRemoteTracks: EventStream<MediaStreamTrack> = never()

  myTracks: DynamicVal<MediaStreamTrack[]> = constant([])
  othersTracks: DynamicVal<Record<Stream['mid'], MediaStreamTrack>> = constant(
    {}
  )

  otherPublishers: DynamicVal<Publisher[]> = constant([])

  myMic: DynamicVal<MediaStreamTrack> = constant(null as any)
  myCam: DynamicVal<MediaStreamTrack> = constant(null as any)
  othersCams: DynamicVal<MediaStreamTrack[]> = constant([])

  constructor(
    public server: string[],
    public roomId: number,
    public displayName: string
  ) {
    this.opaqueId = `room-${Janus.randomString(12)}`
  }

  init = _.once(async () => {
    const [publisherHandle, subscriberHandle] = await Promise.all([
      this.getPublisherHandle(),
      this.getSubscriberHandle(),
    ])

    this.addedPublishers
      .take(1)
      .doLog('initial publishers:')
      .onValue(async (publishers) => {
        await this.joinAsPublisher()
        await this.joinAsSubscriber(publishers)
      })
    this.addedPublishers
      .skip(1)
      .doLog('added publisher:')
      .onValue(async (publishers) => {
        await this.joinAsSubscriber([])
        await this.subscribeToPublishers(publishers)
      })
    this.removedPublishers
      .filter((id) => id !== this.publisherId)
      .groupBy(
        (id) => id,
        (s) => s.debounce(200)
      )
      .flatMap((s) => s)
      .doLog('removed publisher:')
      .onValue(async (publisher) => {
        await this.unsubscribeFromPublisher(publisher)
      })

    publisherHandle.sdps.onValue((jsep) => {
      publisherHandle.handleRemoteJsep({ jsep })
    })
    subscriberHandle.sdps.onValue(async (offer) => {
      const answer = await acceptSdpOffer(subscriberHandle, offer)
      await sendRequest(subscriberHandle, { request: 'start' }, answer)
    })

    subscriberHandle.observableCallbacks.onremotetrack
      .filter(([, , added]) => added)
      .onValue(async ([_, mid]) => {
        await sendRequest(subscriberHandle, {
          request: 'configure',
          mid,
          substream: 2,
        })
      })
  })

  destroy = _.once(async () => {
    const [session, publisherHandle, subscriberHandle] = await Promise.all([
      this.getSession(),
      this.getPublisherHandle(),
      this.getSubscriberHandle(),
    ])

    await Promise.all([
      detachPlugin(subscriberHandle),
      detachPlugin(publisherHandle),
    ])

    return destroySession(session)
  })

  getSession = _.once(async () => {
    return createSession(this.server)
  })

  getPublisherHandle = _.once(async () => {
    const session = await this.getSession()
    const handle = await attachToPlugin(
      session,
      'janus.plugin.videoroom',
      this.opaqueId
    )
    handle.messages.onError(console.error)

    const [addedPublishers, removedPublishers, currentPublishers] =
      getPublishersObservable(handle)
    this.addedPublishers = addedPublishers
    this.removedPublishers = removedPublishers
    this.otherPublishers = currentPublishers

    const [addedLocalTracks, removedLocalTracks, currentLocalTracks] =
      getLocalTracksObservable(handle)
    this.addedLocalTracks = addedLocalTracks
    this.removedLocalTracks = removedLocalTracks
    this.myTracks = currentLocalTracks

    this.myMic = this.addedLocalTracks
      .filter((track) => track.kind === 'audio')
      .toProperty()
    // TODO FIXME distinct myCam and myScreen
    this.myCam = this.addedLocalTracks
      .filter((track) => track.kind === 'video')
      .toProperty()

    return handle
  })

  getSubscriberHandle = _.once(async () => {
    const session = await this.getSession()
    const handle = await attachToPlugin(
      session,
      'janus.plugin.videoroom',
      this.opaqueId
    )
    handle.messages.onError(console.error)

    const [addedRemoteTracks, removedRemoteTracks, currentRemoteTracks] =
      getRemoteTracksObservable(handle)
    this.addedRemoteTracks = addedRemoteTracks
    this.removedRemoteTracks = removedRemoteTracks
    this.othersTracks = currentRemoteTracks

    this.othersCams = this.othersTracks.map((o) =>
      _.values(o).filter((track) => track.kind === 'video')
    )

    return handle
  })

  joinAsPublisher = _.once(async () => {
    const handle = await this.getPublisherHandle()

    const joinAsPublisherRequest = {
      request: 'join',
      room: this.roomId,
      ptype: 'publisher',
      display: this.displayName,
    }

    const joinAsPublisherResponse = await sendRequest<VideoroomJoinedMessage>(
      handle,
      joinAsPublisherRequest
    )

    const { id, private_id: privateId } = joinAsPublisherResponse
    this.publisherId = id
    this.privateId = privateId
  })

  async publishMe(withCam: boolean, withMic: boolean, stream?: MediaStream) {
    const handle = await this.getPublisherHandle()

    const initialOffer: Partial<Offer> = {
      stream,
      media: stream
        ? undefined
        : {
            audioRecv: false,
            videoRecv: false,
            audioSend: withMic,
            videoSend: withCam,
            video: 'hires',
          },
      simulcast: true,
      sendEncodings: [
        { rid: 'h', active: true, maxBitrate: 1000000 },
        {
          rid: 'm',
          active: true,
          maxBitrate: 300000,
          scaleResolutionDownBy: 2,
        },
        {
          rid: 'l',
          active: true,
          maxBitrate: 100000,
          scaleResolutionDownBy: 4,
        },
      ],
    }

    const offer = await negotiatePublisherSdp(handle, initialOffer)

    const publishRequest = {
      request: 'configure',
      audio: withMic,
      video: withCam,
      audiocodec: 'opus',
      videocodec: 'vp8',
    }

    await sendRequest(handle, publishRequest, offer)
  }
  async unpublishMe() {
    const handle = await this.getPublisherHandle()
    await sendRequest(handle, { request: 'unpublish' })
  }

  joinAsSubscriber = _.once(async (publishersToSubscribe: Publisher[]) => {
    const handle = await this.getSubscriberHandle()

    const joinAsSubscriberRequest = {
      request: 'join',
      room: this.roomId,
      private_id: this.privateId,
      ptype: 'subscriber',
      streams: publishersToSubscribe.flatMap(({ id, streams }) =>
        streams.map(({ mid }) => ({ feed: id, mid }))
      ),
    }

    await sendRequest(handle, joinAsSubscriberRequest)
  })

  async subscribeToPublishers(publishersToSubscribe: Publisher[]) {
    const handle = await this.getSubscriberHandle()

    const subscribeRequest = {
      request: 'subscribe',
      streams: publishersToSubscribe.flatMap(({ id, streams }) =>
        streams.map(({ mid }) => ({ feed: id, mid }))
      ),
    }

    await sendRequest(handle, subscribeRequest)
  }

  async unsubscribeFromPublisher(id: Publisher['id']) {
    const handle = await this.getSubscriberHandle()
    const unsubscribeRequest = {
      request: 'unsubscribe',
      streams: [
        {
          feed: id,
        },
      ],
    }
    await sendRequest(handle, unsubscribeRequest)
  }

  async leave() {
    const [publisherHandle, subscriberHandle] = await Promise.all([
      this.getPublisherHandle(),
      this.getSubscriberHandle(),
    ])

    await Promise.all([
      sendRequest(publisherHandle, { request: 'leave' }),
      sendRequest(subscriberHandle, { request: 'leave' }),
    ])
  }
}

function getPublishersObservable(handle: PluginHandleWithObservableCallbacks) {
  const joined = handle.messages.filter(
    isJoinedResponse
  ) as EventStream<VideoroomJoinedMessage>
  const notified = handle.messages.filter(
    isEventMessage
  ) as EventStream<VideoroomEventMessage>
  const leaving = handle.messages.flatMap((msg) =>
    isEventMessage(msg) && msg.leaving ? once(msg.leaving) : never()
  ) as EventStream<Publisher['id']>
  const unpublished = handle.messages.flatMap((msg) =>
    isEventMessage(msg) && msg.unpublished ? once(msg.unpublished) : never()
  ) as EventStream<Publisher['id']>

  const addedPublishers = joined
    .merge(notified)
    .flatMap<Publisher[]>(({ publishers }) =>
      publishers && !_.isEmpty(publishers) ? once(publishers) : never()
    )
  const removedPublishers = leaving
    .merge(unpublished)
    .filter((id) => id !== 'ok')

  const currentPublishers = addedPublishers.scan<Publisher[]>([], _.concat)

  return [addedPublishers, removedPublishers, currentPublishers] as const
}

function getLocalTracksObservable(handle: PluginHandleWithObservableCallbacks) {
  const addedLocalTracks =
    handle.observableCallbacks.onlocaltrack.flatMap<MediaStreamTrack>(
      ([track, added]) => (added ? once(track) : never())
    )
  const removedLocalTracks =
    handle.observableCallbacks.onlocaltrack.flatMap<MediaStreamTrack>(
      ([track, added]) => (added ? never() : once(track))
    )

  const currentLocalTracks = handle.observableCallbacks.onlocaltrack.scan(
    handle.webrtcStuff.myStream?.getTracks() ?? [],
    (tracks, [track, added]) => {
      return added
        ? [...tracks, track]
        : tracks.filter(({ id }) => id !== track.id)
    }
  )

  return [addedLocalTracks, removedLocalTracks, currentLocalTracks] as const
}

export function getRemoteTracksObservable(
  handle: PluginHandleWithObservableCallbacks
) {
  const addedRemoteTracks =
    handle.observableCallbacks.onremotetrack.flatMap<MediaStreamTrack>(
      ([track, _, added]) => (added ? once(track) : never())
    )
  const removedRemoteTracks =
    handle.observableCallbacks.onremotetrack.flatMap<MediaStreamTrack>(
      ([track, _, added]) => (added ? never() : once(track))
    )

  const currentRemoteTracks = handle.observableCallbacks.onremotetrack.scan(
    {} as Record<Stream['mid'], MediaStreamTrack>,
    (tracks, [track, mid, added]) => {
      if (added) tracks[mid] = track
      else delete tracks[mid]
      return tracks
    }
  )

  return [addedRemoteTracks, removedRemoteTracks, currentRemoteTracks] as const
}
