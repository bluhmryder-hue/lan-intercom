# Troubleshooting

## `node` or `npm` not found

- Install Node.js 18 or newer.
- Reopen your terminal after installation.

## Port `5173` is already in use

- Stop the process using `5173`.
- Or set `PORT=XXXX` before launching.

## Phone cannot reach the app

- Confirm the phone is on the same LAN or Wi-Fi network.
- Check that the host firewall allows inbound connections on the chosen port.
- Re-run the launcher so it prints the current LAN IP and QR code.

## Browser opens but the page is blank

- Re-run the launcher and watch for build errors.
- Open the printed local URL directly.

## QR code is not scanning

- Use the printed LAN URL manually.
- Re-run the launcher if the host IP changed.

