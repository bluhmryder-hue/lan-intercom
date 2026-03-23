# LAN Intercom

Browser-based LAN-only video/audio intercom with QR code access, secure local signaling, and cross-platform one-click launch.

## One-Click Deploy

The repo includes launchers for the three desktop OS families:

- Windows: `setup-lan-p2p-mvp-cross-win.bat`
- macOS: `setup-lan-p2p-mvp-cross-macos.command`
- Linux/macOS shell: `setup-lan-p2p-mvp-cross-unix.sh`

Each launcher:

- installs dependencies
- builds the app
- starts an HTTPS LAN server on port `5173`
- hosts the WebSocket signaling room at `/signal`
- prints the local and LAN URLs
- renders a QR code in the terminal for phone access
- opens the browser on the host machine when possible

You can also run the shared launcher directly:

```bash
node scripts/oneclick-deploy.mjs
```

## Notes

- Camera and microphone access require the HTTPS launcher, not plain HTTP.
- The first browser visit may show a certificate warning because the server uses a local self-signed certificate.

## Docs

Start here: [docs/README.md](docs/README.md)


