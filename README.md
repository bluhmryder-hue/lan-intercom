# EchoLAN

Modern, private, and secure LAN-only communication platform. Zero internet, zero cloud, 100% local.

## Features
- **Auto-Discovery**: mDNS/Bonjour for instant peer detection.
- **P2P Text Chat**: Secure, real-time messaging via WebRTC DataChannels.
- **P2P File Sharing**: Support for large files (up to 2GB) with chunked transfer.
- **Intercom**: Opt-in voice and video feeds with local-only signaling.
- **Privacy First**: No data ever leaves your Local Area Network.

## One-Click Deploy
Launch EchoLAN on any desktop OS:
- Windows: `setup-lan-p2p-mvp-cross-win.bat`
- macOS: `setup-lan-p2p-mvp-cross-macos.command`
- Linux/UNIX: `setup-lan-p2p-mvp-cross-unix.sh`

Or manually:
```bash
node scripts/oneclick-deploy.mjs
```

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS 4.
- **Server**: Node.js, WebSocket, `bonjour-service`.
- **Media**: WebRTC (P2P).

## Environment Setup
Copy `.env.example` to `.env` and configure your local settings.
