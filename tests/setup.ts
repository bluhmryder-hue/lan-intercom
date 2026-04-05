import "@testing-library/jest-dom/vitest";
import "vitest-canvas-mock";

// Mock WebRTC and other browser APIs if needed
Object.defineProperty(navigator, "mediaDevices", {
  value: {
    getUserMedia: async () => new MediaStream(),
  },
  configurable: true,
});

class MockRTCPeerConnection {
  createOffer = async () => ({ type: "offer", sdp: "" });
  createAnswer = async () => ({ type: "answer", sdp: "" });
  setLocalDescription = async () => {};
  setRemoteDescription = async () => {};
  addIceCandidate = async () => {};
  addTrack = () => {};
  getTracks = () => [];
  close = () => {};
}

Object.defineProperty(window, "RTCPeerConnection", {
  value: MockRTCPeerConnection,
  configurable: true,
});

Object.defineProperty(window, "AudioContext", {
  value: class {
    state = "suspended";
    resume = async () => { this.state = "running"; };
    createGain = () => ({
      gain: { value: 0, exponentialRampToValueAtTime: () => {} },
      connect: () => {},
    });
    createOscillator = () => ({
      type: "",
      frequency: { value: 0 },
      connect: () => {},
      start: () => {},
      stop: () => {},
    });
    close = async () => {};
    currentTime = 0;
    destination = {};
  },
  configurable: true,
});
