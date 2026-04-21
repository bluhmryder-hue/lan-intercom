# EchoLAN Architecture

## Core Principles
1. **LAN-Only**: Strictly no outbound connections.
2. **Privacy**: P2P communication for text, voice, and files.
3. **Discovery**: mDNS via `bonjour-service` for local peer detection.

## Discovery
- The Node.js server advertises `_echolan._tcp` on the local network.
- Clients browse for `_echolan._tcp` to find the signaling server.

## Signaling
- WebSocket-based signaling for WebRTC handshake.
- Hosted locally on the EchoLAN server.

## Media & Data
- Text Chat: WebRTC DataChannel.
- File Transfer: WebRTC DataChannel (chunked).
- Voice/Video: WebRTC MediaStreams (Opt-in).
