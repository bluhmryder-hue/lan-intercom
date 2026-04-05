import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startIntercom } from './intercom';

describe('startIntercom', () => {
  let options: any;
  let onStatus: any;
  let onLocalStream: any;
  let onPeersChange: any;
  let onError: any;

  beforeEach(() => {
    vi.useFakeTimers();
    onStatus = vi.fn();
    onLocalStream = vi.fn();
    onPeersChange = vi.fn();
    onError = vi.fn();

    options = {
      roomId: 'test-room',
      displayName: 'test-user',
      signalUrl: 'ws://test-signal-url',
      onStatus,
      onLocalStream,
      onPeersChange,
      onError,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    (global.WebSocket as any).instances = [];
    (global.RTCPeerConnection as any).instances = [];
  });

  it('should request media access and connect to signaling server', async () => {
    startIntercom(options);
    expect(onStatus).toHaveBeenCalledWith('Requesting camera and microphone access');
    await vi.runAllTimersAsync();
    expect(onLocalStream).toHaveBeenCalledWith(expect.any(MediaStream));
    expect(onStatus).toHaveBeenCalledWith('Connecting to LAN signaling');
    const socket = (global.WebSocket as any).lastInstance;
    expect(socket).toBeDefined();
    expect(socket.url).toBe(options.signalUrl);
  });

  it('should join the room on websocket open', async () => {
    startIntercom(options);
    await vi.runAllTimersAsync();
    const socket = (global.WebSocket as any).lastInstance;
    await socket.trigger('open', { type: 'open' });
    expect(onStatus).toHaveBeenCalledWith('Connected to signaling server');
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'join', roomId: 'test-room', name: 'test-user'
    }));
  });

  it('should handle "joined" message and create connections for existing peers', async () => {
    startIntercom(options);
    await vi.runAllTimersAsync();
    const socket = (global.WebSocket as any).lastInstance;
    await socket.trigger('open', { type: 'open' });
    const joinedPayload = {
      type: 'joined', peerId: 'self-id', roomId: 'test-room', peers: [{ id: 'peer-1', name: 'Other User' }]
    };
    await socket.trigger('message', { data: JSON.stringify(joinedPayload) });
    expect(onStatus).toHaveBeenCalledWith('Joined room test-room');
    expect(onPeersChange).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'peer-1', name: 'Other User', state: 'connecting' })
    ]));
    const pc = (global.RTCPeerConnection as any).lastInstance;
    expect(pc).toBeDefined();
    expect(pc.addTrack).toHaveBeenCalled();
  });

  it('should handle "peer-joined" message', async () => {
    startIntercom(options);
    await vi.runAllTimersAsync();
    const socket = (global.WebSocket as any).lastInstance;
    await socket.trigger('open', { type: 'open' });
    await socket.trigger('message', { data: JSON.stringify({ type: 'joined', peerId: 'self-id', roomId: 'test-room', peers: [] }) });
    const peerJoinedPayload = { type: 'peer-joined', peer: { id: 'peer-2', name: 'New User' } };
    await socket.trigger('message', { data: JSON.stringify(peerJoinedPayload) });
    expect(onPeersChange).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'peer-2', name: 'New User' })
    ]));
  });

  it('should handle "peer-left" message', async () => {
    startIntercom(options);
    await vi.runAllTimersAsync();
    const socket = (global.WebSocket as any).lastInstance;
    await socket.trigger('open', { type: 'open' });
    await socket.trigger('message', { data: JSON.stringify({
      type: 'joined', peerId: 'self-id', roomId: 'test-room', peers: [{ id: 'peer-1', name: 'Peer 1' }]
    }) });
    await socket.trigger('message', { data: JSON.stringify({ type: 'peer-left', peerId: 'peer-1' }) });
    const lastPeers = onPeersChange.mock.calls[onPeersChange.mock.calls.length - 1][0];
    expect(lastPeers).toHaveLength(0);
  });

  it('should handle "signal" (offer) and send answer', async () => {
    startIntercom(options);
    await vi.runAllTimersAsync();
    const socket = (global.WebSocket as any).lastInstance;
    await socket.trigger('open', { type: 'open' });
    await socket.trigger('message', { data: JSON.stringify({ type: 'joined', peerId: 'self-id', roomId: 'test-room', peers: [] }) });
    const offerPayload = {
      type: 'signal', from: 'peer-1', signal: { kind: 'offer', description: { type: 'offer', sdp: 'remote-offer-sdp' } }
    };
    await socket.trigger('message', { data: JSON.stringify(offerPayload) });
    const pc = (global.RTCPeerConnection as any).lastInstance;
    expect(pc.setRemoteDescription).toHaveBeenCalledWith(offerPayload.signal.description);
    expect(pc.createAnswer).toHaveBeenCalled();
    expect(pc.setLocalDescription).toHaveBeenCalled();
    expect(socket.send).toHaveBeenCalledWith(expect.stringContaining('"kind":"answer"'));
  });

  it('should handle WebRTC ice candidates', async () => {
    startIntercom(options);
    await vi.runAllTimersAsync();
    const socket = (global.WebSocket as any).lastInstance;
    await socket.trigger('open', { type: 'open' });
    await socket.trigger('message', { data: JSON.stringify({ type: 'joined', peerId: 'self-id', roomId: 'test-room', peers: [] }) });
    await socket.trigger('message', { data: JSON.stringify({
      type: 'signal', from: 'peer-1', signal: { kind: 'offer', description: { type: 'offer', sdp: 'remote-offer' } }
    }) });
    const icePayload = {
      type: 'signal', from: 'peer-1', signal: { kind: 'ice', candidate: { candidate: 'ice-candidate-string', sdpMid: '0', sdpMLineIndex: 0 } }
    };
    await socket.trigger('message', { data: JSON.stringify(icePayload) });
    const pc = (global.RTCPeerConnection as any).lastInstance;
    expect(pc.addIceCandidate).toHaveBeenCalledWith(icePayload.signal.candidate);
  });

  it('should queue and flush ICE candidates before remote description is set', async () => {
    startIntercom(options);
    await vi.runAllTimersAsync();
    const socket = (global.WebSocket as any).lastInstance;
    await socket.trigger('open', { type: 'open' });
    await socket.trigger('message', { data: JSON.stringify({ type: 'joined', peerId: 'self-id', roomId: 'test-room', peers: [] }) });
    const iceCandidate = { candidate: 'queued-ice', sdpMid: '0', sdpMLineIndex: 0 };
    await socket.trigger('message', { data: JSON.stringify({
      type: 'signal', from: 'peer-1', signal: { kind: 'ice', candidate: iceCandidate }
    }) });
    const pc = (global.RTCPeerConnection as any).lastInstance;
    expect(pc).toBeDefined();
    expect(pc.addIceCandidate).not.toHaveBeenCalled();
    await socket.trigger('message', { data: JSON.stringify({
      type: 'signal', from: 'peer-1', signal: { kind: 'offer', description: { type: 'offer', sdp: 'remote-offer' } }
    }) });
    expect(pc.addIceCandidate).toHaveBeenCalledWith(iceCandidate);
  });

  it('should handle cleanup', async () => {
    const cleanup = await startIntercom(options);
    await vi.runAllTimersAsync();
    const socket = (global.WebSocket as any).lastInstance;
    cleanup();
    expect(socket.close).toHaveBeenCalled();
    const lastPeers = onPeersChange.mock.calls[onPeersChange.mock.calls.length - 1][0];
    expect(lastPeers).toHaveLength(0);
  });

  it('should handle media access error', async () => {
    const mediaError = new Error('Permission denied');
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(mediaError);
    await expect(startIntercom(options)).rejects.toThrow('Permission denied');
    expect(onError).toHaveBeenCalledWith('Permission denied');
  });

  it('should handle WebSocket error', async () => {
    startIntercom(options);
    await vi.runAllTimersAsync();
    const socket = (global.WebSocket as any).lastInstance;
    await socket.trigger('error', { type: 'error' });
    expect(onError).toHaveBeenCalledWith('WebSocket signaling failed.');
  });

  it('should handle "error" message from server', async () => {
    startIntercom(options);
    await vi.runAllTimersAsync();
    const socket = (global.WebSocket as any).lastInstance;
    await socket.trigger('message', { data: JSON.stringify({ type: 'error', message: 'server error' }) });
    expect(onError).toHaveBeenCalledWith('server error');
  });

  it('should handle "signal" error', async () => {
    startIntercom(options);
    await vi.runAllTimersAsync();
    const socket = (global.WebSocket as any).lastInstance;
    await socket.trigger('open', { type: 'open' });
    await socket.trigger('message', { data: JSON.stringify({ type: 'joined', peerId: 'self-id', roomId: 'test-room', peers: [] }) });
    await socket.trigger('message', { data: JSON.stringify({ type: 'peer-joined', peer: { id: 'peer-1', name: 'Peer 1' } }) });
    const pc = (global.RTCPeerConnection as any).lastInstance;
    pc.setRemoteDescription.mockRejectedValueOnce(new Error('SDP error'));
    await socket.trigger('message', { data: JSON.stringify({
      type: 'signal', from: 'peer-1', signal: { kind: 'offer', description: { type: 'offer', sdp: 'invalid' } }
    }) });
    expect(onError).toHaveBeenCalledWith('Failed to process signaling message.');
  });

  it('should notify status on socket close', async () => {
    startIntercom(options);
    await vi.runAllTimersAsync();
    const socket = (global.WebSocket as any).lastInstance;
    await socket.trigger('close', { type: 'close' });
    expect(onStatus).toHaveBeenCalledWith('Disconnected from signaling server');
  });

  it('should not send if socket is not open', async () => {
    startIntercom(options);
    await vi.runAllTimersAsync();
    const socket = (global.WebSocket as any).lastInstance;
    socket.readyState = 0; // CONNECTING
    await socket.trigger('message', { data: JSON.stringify({ type: 'joined', peerId: 'self-id', roomId: 'test-room', peers: [{id: 'p1', name: 'N1'}] }) });
    expect(socket.send).not.toHaveBeenCalledWith(expect.stringContaining('"type":"signal"'));
  });

  it('should handle ICE candidate addition failure', async () => {
    startIntercom(options);
    await vi.runAllTimersAsync();
    const socket = (global.WebSocket as any).lastInstance;
    await socket.trigger('open', { type: 'open' });
    await socket.trigger('message', { data: JSON.stringify({ type: 'joined', peerId: 'self-id', roomId: 'test-room', peers: [] }) });
    await socket.trigger('message', { data: JSON.stringify({
      type: 'signal', from: 'p1', signal: { kind: 'offer', description: { type: 'offer', sdp: 'sdp' } }
    }) });
    const pc = (global.RTCPeerConnection as any).lastInstance;
    pc.addIceCandidate.mockRejectedValueOnce(new Error('ICE error'));
    await socket.trigger('message', { data: JSON.stringify({
      type: 'signal', from: 'p1', signal: { kind: 'ice', candidate: { candidate: 'c' } }
    }) });
    expect(pc.addIceCandidate).toHaveBeenCalled();
  });

  it('should handle "signal" (answer)', async () => {
    startIntercom(options);
    await vi.runAllTimersAsync();
    const socket = (global.WebSocket as any).lastInstance;
    await socket.trigger('open', { type: 'open' });
    await socket.trigger('message', { data: JSON.stringify({
      type: 'joined', peerId: 'a', roomId: 'r', peers: [{id: 'b', name: 'B'}]
    }) });
    const pc = (global.RTCPeerConnection as any).lastInstance;
    const answerPayload = {
      type: 'signal', from: 'b', signal: { kind: 'answer', description: { type: 'answer', sdp: 'ans' } }
    };
    await socket.trigger('message', { data: JSON.stringify(answerPayload) });
    expect(pc.setRemoteDescription).toHaveBeenCalledWith(answerPayload.signal.description);
  });

  it('should handle disposed state in socket open', async () => {
    // Manually control the socket to prevent auto-triggering 'open' before cleanup
    const originalWebSocket = global.WebSocket;
    (global as any).WebSocket = class extends (originalWebSocket as any) {
      constructor(url: string) {
        super(url);
        // Clear the auto-open timeout from setup
      }
    };

    const cleanup = await startIntercom(options);
    await vi.runAllTimersAsync();
    const socket = (global.WebSocket as any).lastInstance;

    // Manually ensure it's not opened yet if it was auto-opened
    socket.readyState = 0; // CONNECTING
    socket.send.mockClear();

    cleanup();
    await socket.trigger('open', { type: 'open' });
    expect(socket.send).not.toHaveBeenCalledWith(expect.stringContaining('"type":"join"'));

    // Restore original mock
    global.WebSocket = originalWebSocket;
  });
});
