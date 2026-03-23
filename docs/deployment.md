# Deployment

## One-Click Launchers

- Windows: `setup-lan-p2p-mvp-cross-win.bat`
- macOS: `setup-lan-p2p-mvp-cross-macos.command`
- Linux/macOS shell: `setup-lan-p2p-mvp-cross-unix.sh`

## Shared Launcher

You can also run the shared Node launcher directly:

```bash
node scripts/oneclick-deploy.mjs
```

## What the Launcher Does

1. Installs dependencies.
2. Builds the production app.
3. Serves the `dist/` folder over HTTPS on `0.0.0.0:5173`.
4. Exposes a WebSocket signaling room at `/signal`.
5. Prints a LAN URL and a QR code for phones.
6. Opens the browser on the host machine when possible.

## Optional Environment Variables

- `PORT`: change the serving port.
- `NO_BROWSER=1`: skip opening the browser automatically.

## First Run Note

The launcher uses a local self-signed certificate. The first browser visit may show a certificate warning; continue to the site so camera and microphone access can work.
