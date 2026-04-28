import '@testing-library/jest-dom'
import { vi } from 'vitest'
import 'vitest-canvas-mock'

// Mock MediaStream
class MediaStreamMock {
  getTracks() { return [] }
}

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue(new MediaStreamMock()),
  },
})

// Mock WebSocket
class WebSocketMock {
  addEventListener = vi.fn()
  removeEventListener = vi.fn()
  send = vi.fn()
  close = vi.fn()
  readyState = 1 // OPEN
}
(global as any).WebSocket = WebSocketMock

// Mock RTCPeerConnection
class RTCPeerConnectionMock {
  createOffer = vi.fn()
  setLocalDescription = vi.fn()
  setRemoteDescription = vi.fn()
  createAnswer = vi.fn()
  addIceCandidate = vi.fn()
  addTrack = vi.fn()
  createDataChannel = vi.fn()
  close = vi.fn()
}
(global as any).RTCPeerConnection = RTCPeerConnectionMock
