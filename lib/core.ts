import _ from 'lodash'
import {
  EventStream,
  fromBinder,
  Error as RxError,
  once,
  fromArray,
} from 'baconjs'
import adapter from 'webrtc-adapter'
import Janus, {
  PluginHandle,
  VideoroomJoinedMessage,
  JSEP,
  Offer,
  VideoroomMessage,
  PluginCallbacks,
  PluginName,
  VideoroomAttachedMessage,
  VideoroomStartedMessage,
  VideoroomEventMessage,
  VideoroomUpdatedMessage,
  JanusMessage,
  StreamingMessage,
  PluginHandleMap,
} from './upstream/janus.es'

const init = _.once(() => {
  return new Promise<void>((resolve) => {
    Janus.init({
      debug: ['warn', 'error', 'debug'],
      callback: resolve,
      dependencies: Janus.useDefaultDependencies({
        adapter,
      }),
    })
  })
})

export async function createSession(
  servers: string | string[]
): Promise<Janus> {
  await init()

  return new Promise<Janus>((resolve, reject) => {
    const session = new Janus({
      server: servers,
      success: () => {
        resolve(session)
      },
      error: reject,
    })
  })
}

export async function destroySession(session: Janus) {
  return new Promise<void>((resolve, reject) => {
    session.destroy({
      success: resolve,
      error: reject,
    })
  })
}

export type PluginObservables = {
  [K in keyof PluginCallbacks]: EventStream<Parameters<PluginCallbacks[K]>>
}

export interface PluginHandleWithObservableCallbacks extends PluginHandle {
  observableCallbacks: PluginObservables
  messages: EventStream<JanusMessage>
  sdps: EventStream<JSEP>
}

export async function attachToPlugin<P extends PluginName>(
  session: Janus,
  plugin: P,
  opaqueId: string
): Promise<PluginHandleWithObservableCallbacks> {
  const [pluginCallbacks, pluginObservables] = getCallbacksBoundToObservables()

  const messagesAndSdps = pluginObservables.onmessage.flatMap<
    JanusMessage | JSEP
  >(([msg, jsep, transactionId]) => {
    if (msg.error || _.isNumber(msg.error_code)) {
      return once(new RxError(msg))
    } else {
      if (msg && transactionId) msg.transactionId = transactionId
      return jsep ? fromArray([msg, jsep]) : once(msg)
    }
  })

  const pluginHandle = await new Promise<PluginHandleMap[P]>(
    (resolve, reject) => {
      session.attach({
        plugin,
        opaqueId,
        success: resolve,
        error: reject,
        consentDialog: (...args) => {
          pluginCallbacks.consentDialog(...args)
        },
        iceState: (...args) => {
          pluginCallbacks.iceState(...args)
        },
        mediaState: (...args) => {
          pluginCallbacks.mediaState(...args)
        },
        webrtcState: (...args) => {
          pluginCallbacks.webrtcState(...args)
        },
        slowLink: (...args) => {
          pluginCallbacks.slowLink(...args)
        },
        onmessage: (...args) => {
          pluginCallbacks.onmessage(...args)
        },
        onlocaltrack: (...args) => {
          pluginCallbacks.onlocaltrack(...args)
        },
        onremotetrack: (...args) => {
          pluginCallbacks.onremotetrack(...args)
        },
        ondata: (...args) => {
          pluginCallbacks.ondata(...args)
        },
        ondataopen: (...args) => {
          pluginCallbacks.ondataopen(...args)
        },
        oncleanup: (...args) => {
          pluginCallbacks.oncleanup(...args)
        },
        ondetached: (...args) => {
          pluginCallbacks.ondetached(...args)
        },
      })
    }
  )

  return {
    ...pluginHandle,
    observableCallbacks: pluginObservables,
    messages: messagesAndSdps.filter(
      isJanusMessage
    ) as EventStream<JanusMessage>,
    sdps: messagesAndSdps.filter(isSdp) as EventStream<JSEP>,
  }
}

export async function detachPlugin(
  handle: PluginHandleWithObservableCallbacks
) {
  return new Promise<void>((resolve, reject) => {
    handle.detach({
      success: resolve,
      error: reject,
    })
  })
}

function getCallbacksBoundToObservables() {
  const pluginCallbacks: PluginCallbacks = {
    consentDialog: _.noop,
    iceState: _.noop,
    mediaState: _.noop,
    webrtcState: _.noop,
    slowLink: _.noop,
    onmessage: _.noop,
    onlocaltrack: _.noop,
    onremotetrack: _.noop,
    ondata: _.noop,
    ondataopen: _.noop,
    oncleanup: _.noop,
    ondetached: _.noop,
  }

  const pluginObservables: PluginObservables = {
    consentDialog: fromBinder((sink) => {
      pluginCallbacks.consentDialog = (...args) => sink(args)
      return () => {
        pluginCallbacks.consentDialog = _.noop
      }
    }),
    iceState: fromBinder((sink) => {
      pluginCallbacks.iceState = (...args) => sink(args)
      return () => {
        pluginCallbacks.iceState = _.noop
      }
    }),
    mediaState: fromBinder((sink) => {
      pluginCallbacks.mediaState = (...args) => sink(args)
      return () => {
        pluginCallbacks.mediaState = _.noop
      }
    }),
    webrtcState: fromBinder((sink) => {
      pluginCallbacks.webrtcState = (...args) => sink(args)
      return () => {
        pluginCallbacks.webrtcState = _.noop
      }
    }),
    slowLink: fromBinder((sink) => {
      pluginCallbacks.slowLink = (...args) => sink(args)
      return () => {
        pluginCallbacks.slowLink = _.noop
      }
    }),
    onmessage: fromBinder((sink) => {
      pluginCallbacks.onmessage = (...args) => sink(args)
      return () => {
        pluginCallbacks.onmessage = _.noop
      }
    }),
    onlocaltrack: fromBinder((sink) => {
      pluginCallbacks.onlocaltrack = (...args) => sink(args)
      return () => {
        pluginCallbacks.onlocaltrack = _.noop
      }
    }),
    onremotetrack: fromBinder((sink) => {
      pluginCallbacks.onremotetrack = (...args) => sink(args)
      return () => {
        pluginCallbacks.onremotetrack = _.noop
      }
    }),
    ondata: fromBinder((sink) => {
      pluginCallbacks.ondata = (...args) => sink(args)
      return () => {
        pluginCallbacks.ondata = _.noop
      }
    }),
    ondataopen: fromBinder((sink) => {
      pluginCallbacks.ondataopen = (...args) => sink(args)
      return () => {
        pluginCallbacks.ondataopen = _.noop
      }
    }),
    oncleanup: fromBinder((sink) => {
      pluginCallbacks.oncleanup = (...args) => sink(args)
      return () => {
        pluginCallbacks.oncleanup = _.noop
      }
    }),
    ondetached: fromBinder((sink) => {
      pluginCallbacks.ondetached = (...args) => sink(args)
      return () => {
        pluginCallbacks.ondetached = _.noop
      }
    }),
  }

  return [pluginCallbacks, pluginObservables] as const
}

export async function sendRequest<ResponseT extends VideoroomMessage>(
  handle: PluginHandleWithObservableCallbacks,
  request: Record<string, unknown>,
  jsep?: JSEP
): Promise<ResponseT> {
  return new Promise<ResponseT>((resolve, reject) => {
    handle.send<ResponseT>({
      message: request,
      jsep,
      success: (msg, transactionId) => {
        if (msg) {
          if (msg.error || msg.error_code) reject(msg)
          else resolve(msg)
          return
        }

        console.debug(`async request xid[${transactionId}]:`, request)

        const responseEvent = handle.messages.filter(
          (msg) => msg.transactionId === transactionId
        ) as unknown as EventStream<ResponseT>

        const unsubVal = responseEvent.onValue((val) => {
          console.debug(`async response xid[${transactionId}]:`, val)
          unsubVal()
          unsubErr()
          resolve(val)
        })
        const unsubErr = responseEvent.onError((err) => {
          if (err.transactionId !== transactionId) return
          console.error(`async error response xid[${transactionId}]:`, err)
          unsubVal()
          unsubErr()
          reject(err)
        })
      },
      error: reject,
    })
  })
}

export function isJanusMessage(msg: any): msg is JanusMessage {
  return isVideoroomMessage(msg) || isStreamingMessage(msg)
}

export function isStreamingMessage(msg: any): msg is StreamingMessage {
  return _.isString(msg?.streaming) // TODO
}

export function isJoinedResponse(msg: any): msg is VideoroomJoinedMessage {
  return msg?.videoroom === 'joined'
}

export function isEventMessage(msg: any): msg is VideoroomEventMessage {
  return msg?.videoroom === 'event'
}

export function isAttachedResponse(msg: any): msg is VideoroomAttachedMessage {
  return msg?.videoroom === 'attached'
}

export function isStartedResponse(msg: any): msg is VideoroomStartedMessage {
  return msg?.started === 'ok' && isEventMessage(msg)
}

export function isUpdatedResponse(msg: any): msg is VideoroomUpdatedMessage {
  return msg?.videoroom === 'updated'
}

export function isVideoroomMessage(
  msgOrSdp: any
): msgOrSdp is VideoroomMessage {
  return _.isString(msgOrSdp?.videoroom)
}

export function isSdp(msgOrSdp: any): msgOrSdp is JSEP {
  return _.isString(msgOrSdp?.sdp)
}

export async function negotiatePublisherSdp(
  handle: PluginHandleWithObservableCallbacks,
  offer: Omit<Offer, 'success' | 'error'>
): Promise<JSEP> {
  return new Promise<JSEP>((resolve, reject) => {
    handle.createOffer({
      ...offer,
      success: resolve,
      error: reject,
    })
  })
}

export async function acceptSdpOffer(
  handle: PluginHandleWithObservableCallbacks,
  offer: JSEP
) {
  return new Promise<JSEP>((resolve, reject) => {
    handle.createAnswer({
      jsep: offer,
      media: {
        audioSend: false,
        videoSend: false,
      },
      success: resolve,
      error: reject,
    })
  })
}
