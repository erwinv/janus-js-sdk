import _ from 'lodash'
import { constant, Property as DynamicVal, Bus } from 'baconjs'
import Janus, { StreamId } from '../upstream/janus.es'
import {
  createSession,
  attachToPlugin,
  acceptSdpOffer,
  sendRequest,
  // detachPlugin,
  destroySession,
} from '../core'
import { getRemoteTracksObservable } from '../videoroom'

export default class JanusStreaming {
  opaqueId: string

  addedRemoteTracks: Bus<MediaStreamTrack> = new Bus()
  removedRemoteTracks: Bus<MediaStreamTrack> = new Bus()
  feeds: Bus<Record<StreamId, MediaStreamTrack>> = new Bus()
  feedsTracks: DynamicVal<MediaStreamTrack[]> = constant([])

  constructor(public server: string[]) {
    this.opaqueId = `stream-${Janus.randomString(12)}`
    this.feedsTracks = this.feeds
      .scan<Record<StreamId, MediaStreamTrack>>({}, (acc, next) => ({
        ...acc,
        ...next,
      }))
      .map((o) => _.values(o).filter((track) => track.kind === 'video'))
      .doLog('feeds tracks:')
      .toProperty()
  }

  destroy = _.once(async () => {
    const [session /*, handle*/] = await Promise.all([
      this.getSession(),
      // this.getHandle(),
    ])

    // await detachPlugin(handle);

    return destroySession(session)
  })

  getSession = _.once(async () => {
    return createSession(this.server)
  })

  getHandle = async (mountpointId: number) => {
    const session = await this.getSession()
    const handle = await attachToPlugin(
      session,
      'janus.plugin.streaming',
      this.opaqueId
    )
    handle.messages.onError(console.error)

    const [addedRemoteTracks, removedRemoteTracks, currentRemoteTracks] =
      getRemoteTracksObservable(handle)
    this.addedRemoteTracks.plug(addedRemoteTracks)
    this.removedRemoteTracks.plug(removedRemoteTracks)
    this.feeds.plug(
      currentRemoteTracks.map((tracks) =>
        _.mapKeys(tracks, (_, mid) => `${mountpointId}-${mid}`)
      )
    )

    return handle
  }

  async watch(mountpointId: number, pin: string) {
    const handle = await this.getHandle(mountpointId)

    handle.sdps.onValue(async (offer) => {
      const answer = await acceptSdpOffer(handle, offer)
      await sendRequest(handle, { request: 'start' }, answer)
    })

    handle.observableCallbacks.onremotetrack
      .filter(([, , added]) => added)
      .onValue(async ([_, mid]) => {
        await sendRequest(handle, {
          request: 'configure',
          mid,
          substream: 2,
        })
      })

    const watchRequest = {
      request: 'watch',
      id: mountpointId,
      pin,
    }

    await sendRequest(handle, watchRequest)
  }
}
