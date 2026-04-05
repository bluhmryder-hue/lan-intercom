import { vi } from 'vitest';

// Mock MediaStreamTrack
class MockMediaStreamTrack {
  kind: string;
  enabled = true;
  readyState = 'live';
  constructor(kind: string) {
    this.kind = kind;
  }
  stop = vi.fn();
}

// Mock MediaStream
class MockMediaStream {
  id = Math.random().toString(36).substr(2, 9);
  private tracks: MockMediaStreamTrack[] = [
    new MockMediaStreamTrack('video'),
    new MockMediaStreamTrack('audio'),
  ];
  getTracks() {
    return this.tracks;
  }
  getVideoTracks() {
    return this.tracks.filter(t => t.kind === 'video');
  }
  getAudioTracks() {
    return this.tracks.filter(t => t.kind === 'audio');
  }
}
(global as any).MediaStream = MockMediaStream as any;

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()),
  },
  configurable: true,
});

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  private listeners: Record<string, Function[]> = {};

  static instances: MockWebSocket[] = [];
  static get lastInstance() {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.trigger('open', { type: 'open' });
      }
    }, 0);
  }

  send = vi.fn();
  close = vi.fn().mockImplementation(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.trigger('close', { type: 'close' });
  });

  addEventListener = vi.fn().mockImplementation((event: string, cb: any) => {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  });

  removeEventListener = vi.fn().mockImplementation((event: string, cb: any) => {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== cb);
    }
  });

  async trigger(event: string, data: any) {
    if (event === 'open') this.readyState = MockWebSocket.OPEN;
    if (this.listeners[event]) {
      for (const cb of this.listeners[event]) {
        await cb(data);
      }
    }
    const onProp = `on${event}`;
    if ((this as any)[onProp]) {
      await (this as any)[onProp](data);
    }
  }
}
(global as any).WebSocket = MockWebSocket as any;

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  connectionState = 'new';
  iceConnectionState = 'new';
  signalingState = 'stable';

  onicecandidate: ((event: any) => void) | null = null;
  ontrack: ((event: any) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  onsignalingstatechange: (() => void) | null = null;

  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;

  private listeners: Record<string, Function[]> = {};

  static instances: MockRTCPeerConnection[] = [];
  static get lastInstance() {
    return MockRTCPeerConnection.instances[MockRTCPeerConnection.instances.length - 1];
  }

  constructor(configuration?: RTCConfiguration) {
    MockRTCPeerConnection.instances.push(this);
  }

  addTrack = vi.fn().mockImplementation((track, stream) => {
    return { track, stream };
  });

  createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'fake-offer-sdp' });
  createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'fake-answer-sdp' });

  setLocalDescription = vi.fn().mockImplementation(async (desc) => {
    this.localDescription = desc;
  });

  setRemoteDescription = vi.fn().mockImplementation(async (desc) => {
    this.remoteDescription = desc;
  });

  addIceCandidate = vi.fn().mockResolvedValue(undefined);

  close = vi.fn().mockImplementation(() => {
    this.connectionState = 'closed';
  });

  addEventListener(event: string, cb: any) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  async trigger(event: string, data: any) {
    if (this.listeners[event]) {
      for (const cb of this.listeners[event]) {
        await cb(data);
      }
    }
    const onProp = `on${event}`;
    if ((this as any)[onProp]) {
      await (this as any)[onProp](data);
    }
  }

  getTracks() {
    return [];
  }
}
(global as any).RTCPeerConnection = MockRTCPeerConnection as any;
(global as any).RTCIceCandidate = class {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  constructor(init: RTCIceCandidateInit) {
    this.candidate = init.candidate || '';
    this.sdpMid = init.sdpMid || null;
    this.sdpMLineIndex = init.sdpMLineIndex || null;
  }
  toJSON() {
    return {
      candidate: this.candidate,
      sdpMid: this.sdpMid,
      sdpMLineIndex: this.sdpMLineIndex,
    };
  }
} as any;
(global as any).RTCSessionDescription = class {
  type: RTCSdpType;
  sdp: string;
  constructor(init: RTCSessionDescriptionInit) {
    this.type = init.type!;
    this.sdp = init.sdp || '';
  }
} as any;
