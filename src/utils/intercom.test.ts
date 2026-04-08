import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startIntercom } from './intercom';

// Mock MediaStream
class MockMediaStream {
  getTracks() {
    return [{ stop: vi.fn() }];
  }
}

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  connectionState = 'new';
  remoteDescription = null;
  localDescription = null;
  onicecandidate = null;
  ontrack = null;
  onconnectionstatechange = null;
  addTrack = vi.fn();
  createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'sdp' });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);
  createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'sdp' });
  addIceCandidate = vi.fn().mockResolvedValue(undefined);
  close = vi.fn();
}

// Mock WebSocket
class MockWebSocket {
  readyState = 1; // OPEN
  send = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();

  constructor(url: string) {
    // Automatically trigger 'open' in next tick to simulate connection
    setTimeout(() => {
        const openHandler = this.addEventListener.mock.calls.find((call: any) => call[0] === 'open');
        if (openHandler) openHandler[1]();
    }, 0);
  }
}

// Set up globals
vi.stubGlobal('MediaStream', MockMediaStream);
vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection);
vi.stubGlobal('WebSocket', MockWebSocket);

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn(),
  },
  configurable: true,
  writable: true
});

describe('startIntercom', () => {
  const options = {
    roomId: 'test-room',
    displayName: 'Test User',
    signalUrl: 'ws://localhost:8080',
    onStatus: vi.fn(),
    onLocalStream: vi.fn(),
    onPeersChange: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Happy Path: successfully requests media and sets up signaling', async () => {
    const mockStream = new MockMediaStream();
    (navigator.mediaDevices.getUserMedia as any).mockResolvedValue(mockStream);

    const stopIntercom = await startIntercom(options);

    expect(options.onStatus).toHaveBeenCalledWith('Requesting camera and microphone access');
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true, audio: true });
    expect(options.onLocalStream).toHaveBeenCalledWith(mockStream);
    expect(options.onStatus).toHaveBeenCalledWith('Connecting to LAN signaling');

    stopIntercom();
  });

  it('Error Path: handles media access failure', async () => {
    const error = new Error('Permission denied');
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(error);

    await expect(startIntercom(options)).rejects.toThrow('Permission denied');

    expect(options.onError).toHaveBeenCalledWith('Permission denied');
  });

  it('Error Path: handles non-Error object rejection in getUserMedia', async () => {
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValue('Some weird error');

    await expect(startIntercom(options)).rejects.toBe('Some weird error');

    expect(options.onError).toHaveBeenCalledWith('Unable to access camera or microphone.');
  });
});
