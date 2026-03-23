# Requirements

## Product Scope

The project is a browser-based LAN app that is started through a one-click launcher on Windows, macOS, or Linux.

## Verified Launcher Requirements

- Install dependencies automatically.
- Build the Vite app before serving.
- Serve the built app on the LAN, not just `localhost`.
- Bind the server to `0.0.0.0`.
- Use port `5173` by default.
- Print both local and LAN URLs.
- Show a QR code in the terminal for phone access.
- Open the browser on the host machine when possible.
- Use HTTPS so camera and microphone access work on phones and desktops.
- Expose a WebSocket signaling endpoint at `/signal`.

## Current App Scope

- Local camera and microphone access work in the browser.
- A direct call connects one host device and one remote device over the LAN with WebRTC.
- Presence options are available in the UI:
  - basic or loud presence labels
  - auto-offline timeout
  - connect chime
- The deploy flow is wired for all desktop OS launchers.

## Out of Scope for Now

- Persistent call history beyond the running process.
- Motion-triggered recording and clip retention.
- H.265 or other advanced encoding paths.
