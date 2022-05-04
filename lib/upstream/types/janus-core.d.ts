import { IAdapter } from 'webrtc-adapter'
import { StreamingMessage, StreamingPluginHandle } from './janus-streaming'
import { VideoroomMessage, VideoroomPluginHandle } from './janus-videoroom'

type ErrorCallback<E = unknown> = (err: E) => void
type SuccessCallback<T> = (val: T) => void

type AudioCodec = 'opus'
type VideoCodec = 'vp8' | 'vp9' | 'h264' | 'h265' | 'av1'

type DebugLevel = 'error' | 'warn' | 'log' | 'debug' | 'trace'

interface DependenciesOverrides {
  adapter: IAdapter
  Promise: typeof Promise
  fetch: typeof fetch
  WebSocket: typeof WebSocket
}

interface HttpApiCallOptions {
  url: string
  options: Partial<{
    timeout: number
    body: Record<string, unknown>
    withCredentials: boolean
    success: SuccessCallback<unknown>
    error: ErrorCallback
    async: boolean
  }>
}

interface Dependencies {
  newWebSocket(
    server: string,
    protocol: string
  ): DependenciesOverrides['WebSocket']
  webRTCAdapter: DependenciesOverrides['adapter']
  isArray<T>(maybeArray: unknown): maybeArray is Array<T>
  checkJanusExtension(): boolean
  httpAPICall(url: string, options: HttpApiCallOptions): void
}

interface InitOptions {
  debug: boolean | 'all' | DebugLevel[]
  callback: SuccessCallback<void>
  dependencies: Dependencies
}

interface ConstructorOptions {
  server: string | string[]
  iceServers: RTCIceServer[]
  ipv6: boolean
  withCredentials: boolean
  max_poll_events: number
  destroyOnUnload: boolean
  token: string
  apisecret: string
  success: SuccessCallback<void>
  error: ErrorCallback
  destroyed(): void
}

export default class Janus {
  static webRTCAdapter: Dependencies['webRTCAdapter']
  static safariVp8: boolean
  static useDefaultDependencies(
    dependencies: Partial<DependenciesOverrides>
  ): Dependencies
  static useOldDependencies(
    dependencies: Partial<DependenciesOverrides>
  ): Dependencies
  static isWebrtcSupported(): boolean
  static debug(...data: any[]): void
  static log(...data: any[]): void
  static warn(...data: any[]): void
  static error(...data: any[]): void
  static randomString(length: number): string
  static attachMediaStream(element: HTMLMediaElement, stream: MediaStream): void
  static reattachMediaStream(to: HTMLMediaElement, from: HTMLMediaElement): void
  static init(options?: Partial<InitOptions>): void

  constructor(
    options?: Pick<ConstructorOptions, 'server'> &
      Partial<Omit<ConstructorOptions, 'server'>>
  )

  getServer(): string
  isConnected(): boolean
  reconnect(
    callbacks?: Partial<{
      success: SuccessCallback<void>
      error: ErrorCallback
    }>
  ): void
  getSessionId(): string
  getInfo(
    callbacks?: Partial<{
      success: SuccessCallback<Record<string, unknown>>
      error: ErrorCallback
    }>
  ): void
  destroy(
    callbacks?: Partial<{
      unload: boolean
      notifyDestroyed: boolean
      cleanupHandles: boolean
      success: SuccessCallback<void>
      error: ErrorCallback
    }>
  ): void
  attach<P extends PluginName>(
    options: PluginFactory<P> &
      Partial<PluginOptions> &
      PluginMessageCallback<P> &
      Partial<PluginCallbacks>
  ): void
}

interface PluginFactory<P extends PluginName> {
  plugin: P
  success: SuccessCallback<PluginHandleMap[P]>
  error: ErrorCallback
}

interface PluginOptions {
  opaqueId: string
  loopIndex: number
  token: string
  dataChannelOptions: RTCDataChannelInit
}

interface PluginCallbacks {
  consentDialog(didConsent: boolean): void
  iceState(state: RTCIceConnectionState): void
  mediaState(
    medium: 'audio' | 'video',
    startedOrStopped: boolean,
    mid: StreamId
  ): void
  webrtcState(upOrDown: boolean, reason?: unknown): void
  slowLink(uplinkOrDownlink: boolean, lost: number, mid: StreamId): void
  onlocaltrack(track: MediaStreamTrack, addedOrRemoved: boolean): void
  onremotetrack(
    track: MediaStreamTrack,
    mid: StreamId,
    addedOrRemoved: boolean
  ): void
  ondata(data: unknown, label: string): void
  ondataopen(label: string, protocol: string): void
  oncleanup(): void
  ondetached(): void
}

interface PluginMessageCallback<P extends PluginName> {
  onmessage(message: PluginMessageMap[P], jsep?: JSEP): void
}

interface PluginHandle {
  session: Janus
  id: string
  token?: PluginOptions['token']
  detached: boolean
  webrtcStuff: {
    started: boolean
    myStream?: MediaStream
    streamExternal: boolean
    remoteStream?: MediaStream
    mySdp?: Pick<JSEP, 'type' | 'sdp'>
    remoteSdp?: JSEP['sdp']
    mediaConstraints?: unknown
    pc?: RTCPeerConnection
    dataChannelOptions?: PluginOptions['dataChannelOptions']
    dataChannel: RTCDataChannel[]
    dtmfSender?: RTCDTMFSender
    trickle: boolean
    iceDone: boolean
    volume: {
      value: number
      timer: number
    }
    bitrate: Record<
      StreamId | 'default',
      {
        timer?: string
        bsnow?: string
        bsbefore?: string
        tsnow?: string
        tsbefore?: string
        value: string
      }
    >
    receiverTransforms: Record<'audio' | 'video', TransformStream>
    senderTransforms: Record<'audio' | 'video', TransformStream>
  }

  getId(): PluginHandle['id']
  getPlugin(): PluginName
  getVolume(mid: StreamId, cb: SuccessCallback<number>): void
  getRemoteVolume(mid: StreamId, cb: SuccessCallback<number>): void
  getLocalVolume(mid: StreamId, cb: SuccessCallback<number>): void
  isAudioMuted(mid: StreamId): boolean
  muteAudio(mid: StreamId): boolean | void
  unmuteAudio(mid: StreamId): boolean | void
  isVideoMuted(mid: StreamId): boolean
  muteVideo(mid: StreamId): boolean | void
  unmuteVideo(mid: StreamId): boolean | void
  getBitrate(mid: StreamId): string | void

  data(payload: {
    text?: string
    data?: unknown
    label?: string
    protocol?: RTCDataChannel['protocol']
    success: SuccessCallback<void>
    error: ErrorCallback
  }): void
  dtmf(payload: { tones: string; duration?: number; gap?: number }): void

  createOffer(offer: Offer): void
  createAnswer(answer: { jsep: JSEP } & Offer): void
  handleRemoteJsep(remoteJsep: { jsep: JSEP }): void
  hangup(sendRequest?: boolean): void
  detach(options?: {
    noRequest?: boolean
    success?: SuccessCallback<void>
    error?: ErrorCallback
  }): void

  set consentDialog(cb: PluginCallbacks['consentDialog'])
  set iceState(cb: PluginCallbacks['iceState'])
  set mediaState(cb: PluginCallbacks['mediaState'])
  set webrtcState(cb: PluginCallbacks['webrtcState'])
  set slowLink(cb: PluginCallbacks['slowLink'])
  set onlocaltrack(cb: PluginCallbacks['onlocaltrack'])
  set onremotetrack(cb: PluginCallbacks['onremotetrack'])
  set ondata(cb: PluginCallbacks['ondata'])
  set ondataopen(cb: PluginCallbacks['ondataopen'])
  set oncleanup(cb: PluginCallbacks['oncleanup'])
  set ondetached(cb: PluginCallbacks['ondetached'])
}

type StreamId = NonNullable<RTCRtpTransceiver['mid']>

interface PluginHandleMap {
  // 'janus.plugin.audiobridge': AudiobridgePluginHandle
  // 'janus.plugin.duktape': DuktapePluginHandle
  // 'janus.plugin.echotest': EchotestPluginHandle
  // 'janus.plugin.lua': LuaPluginHandle
  // 'janus.plugin.nosip': NosipPluginHandle
  // 'janus.plugin.recordplay': RecordplayPluginHandle
  // 'janus.plugin.sip': SipPluginHandle
  'janus.plugin.streaming': StreamingPluginHandle
  // 'janus.plugin.textroom': TextroomPluginHandle
  // 'janus.plugin.videocall': VideocallPluginHandle
  'janus.plugin.videoroom': VideoroomPluginHandle
  // 'janus.plugin.voicemail': VoicemailPluginHandle
}

type PluginName = keyof PluginHandleMap

interface PluginMessageMap {
  'janus.plugin.videoroom': VideoroomMessage
  'janus.plugin.streaming': StreamingMessage
}

interface JSEP {
  type: 'offer' | 'answer'
  sdp: string
  e2ee?: boolean
  rid_order?: 'hml' | 'lmh'
  force_relay?: boolean
}

interface Offer {
  media?: Partial<{
    data: boolean
    audio: boolean | { deviceId: string }
    video:
      | boolean
      | { deviceId: string }
      | 'lowres'
      | 'lowres-16:9'
      | 'stdres'
      | 'stdres-16:9'
      | 'hires'
      | 'hires-16:9'
      | 'hdres'
      | 'fhdres'
      | '4kres'
      | 'screen'
      | 'window'
    audioRecv: boolean
    videoRecv: boolean
    audioSend: boolean
    videoSend: boolean
    addAudio: boolean
    addVideo: boolean
    addData: boolean
    removeAudio: boolean
    removeVideo: boolean
    keepAudio: boolean
    keepVideo: boolean
    replaceAudio: boolean
    replaceVideo: boolean
    failIfNoAudio: boolean
    failIfNoVideo: boolean
    screenshareFrameRate: number
    screenshareHeight: number
    screenshareWidth: number
  }>
  simulcast?: boolean
  simulcast2?: boolean
  svc?: boolean
  simulcastMaxBitrates?: Record<'high' | 'medium' | 'low', unknown>
  sendEncodings?: Array<{
    rid: 'h' | 'm' | 'l'
    active: boolean
    maxBitrate: number
    scaleResolutionDownBy?: number
  }>
  customizeSdp?: (jsep: JSEP) => void
  trickle?: boolean
  stream?: MediaStream
  iceRestart?: boolean
  success: SuccessCallback<JSEP>
  error: ErrorCallback
}

/*
type MessageType =
  | 'recording'
  | 'starting'
  | 'started'
  | 'stopped'
  | 'slow_link'
  | 'preparing'
  | 'refreshing';

interface Message {
  result?: {
    status: MessageType;
    id?: string;
    uplink?: number;
  };
  error?: Error;
}
*/
