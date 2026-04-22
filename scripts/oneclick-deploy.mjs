import { spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import net from "node:net";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const port = Number.parseInt(process.env.PORT ?? "5173", 10);
const host = "0.0.0.0";
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function runCommand(command, args, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n[STEP] ${label}...`);
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", (err) => {
      console.error(`[ERROR] Failed to start command: ${command}`);
      reject(err);
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`[SUCCESS] ${label} completed.`);
        resolve();
        return;
      }
      reject(new Error(`${label} failed with exit code ${code}`));
    });
  });
}

async function isPortAvailable(p) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(p, host);
  });
}

function isPrivateIpv4(address) {
  return (
    address.startsWith("10.") ||
    address.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

function getLanIp() {
  const interfaces = os.networkInterfaces();
  let fallback = null;

  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;

    for (const entry of entries) {
      if (entry.family !== "IPv4" || entry.internal || !entry.address) continue;
      if (isPrivateIpv4(entry.address)) return entry.address;
      if (!fallback) fallback = entry.address;
    }
  }
  return fallback;
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  };
  return map[ext] ?? "application/octet-stream";
}

async function pathExists(filePath) {
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function openBrowser(url) {
  if (process.env.NO_BROWSER === "1" || process.env.RENDER) return;

  const browserCommand =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];

  try {
    const child = spawn(browserCommand[0], browserCommand[1], {
      cwd: projectRoot,
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    // Ignore browser open errors
  }
}

async function installDependenciesIfNeeded() {
  const nodeModulesPath = path.join(projectRoot, "node_modules");
  if (!(await pathExists(nodeModulesPath))) {
    await runCommand(npmCmd, ["install"], "Installing dependencies");
  }
}

async function buildIfNeeded() {
  const indexFile = path.join(distDir, "index.html");
  if (await pathExists(indexFile)) {
    console.log("[INFO] Build artifact found, skipping build step.");
    return;
  }

  // Ensure dependencies are installed before building
  await installDependenciesIfNeeded();

  try {
    await runCommand(npmCmd, ["run", "build"], "Building production bundle");
  } catch (error) {
    console.error(`\n[FATAL] Build failed.`);
    console.error(`Reason: ${error.message}`);
    process.exit(1);
  }

  if (!(await pathExists(indexFile))) {
    console.error(`\n[FATAL] Build output not found at ${indexFile}.`);
    process.exit(1);
  }
}

async function startServer() {
  // Ensure dependencies are installed before importing them dynamically
  await installDependenciesIfNeeded();

  const { default: qrcodeTerminal } = await import("qrcode-terminal");
  const { default: selfsigned } = await import("selfsigned");
  const { WebSocket, WebSocketServer } = await import("ws");
  const { default: BonjourPkg } = await import("bonjour-service");
  const Bonjour = BonjourPkg.default || BonjourPkg;

  const root = path.resolve(distDir);
  const rootPrefix = `${root}${path.sep}`;
  const rooms = new Map();

  const cert = selfsigned.generate(
    [{ name: "commonName", value: "echolan.local" }],
    { algorithm: "sha256", days: 365, keySize: 2048 }
  );

  const bonjour = new Bonjour();

  const server = https.createServer(
    {
      key: cert.private,
      cert: cert.cert,
    },
    async (req, res) => {
      try {
        const requestUrl = new URL(req.url ?? "/", `https://${req.headers.host ?? "localhost"}`);
        let pathname = decodeURIComponent(requestUrl.pathname);

        if (pathname === "/") pathname = "/index.html";

        let filePath = path.resolve(root, `.${pathname}`);
        if (filePath !== root && !filePath.startsWith(rootPrefix)) {
          res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Forbidden");
          return;
        }

        let stat = null;
        try {
          stat = await fsp.stat(filePath);
        } catch {
          stat = null;
        }

        if (stat?.isDirectory()) {
          filePath = path.join(filePath, "index.html");
          stat = null;
        }

        if (!stat) {
          if (path.extname(pathname)) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Not found");
            return;
          }
          filePath = path.join(root, "index.html");
        }

        const body = await fsp.readFile(filePath);
        res.writeHead(200, {
          "Content-Length": body.length,
          "Content-Type": mimeType(filePath),
        });
        res.end(body);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown server error";
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(message);
      }
    }
  );

  const wss = new WebSocketServer({ noServer: true });

  const getRoom = (roomId) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    return rooms.get(roomId);
  };

  const broadcastRoom = (roomId, payload, ignorePeerId = null) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const message = JSON.stringify(payload);
    for (const peer of room.values()) {
      if (ignorePeerId && peer.id === ignorePeerId) continue;
      if (peer.socket.readyState === WebSocket.OPEN) {
        peer.socket.send(message);
      }
    }
  };

  const unregisterPeer = (peerRecord) => {
    if (!peerRecord || !peerRecord.roomId) return;

    const room = rooms.get(peerRecord.roomId);
    if (!room || !room.has(peerRecord.id)) return;

    room.delete(peerRecord.id);
    broadcastRoom(
      peerRecord.roomId,
      { type: "peer-left", peerId: peerRecord.id },
      peerRecord.id
    );

    if (!room.size) {
      rooms.delete(peerRecord.roomId);
    }
  };

  wss.on("connection", (socket) => {
    const peerRecord = {
      id: randomUUID(),
      name: "Guest",
      roomId: "",
      socket,
    };

    socket.on("message", (raw) => {
      let payload;
      try {
        payload = JSON.parse(raw.toString());
      } catch {
        socket.send(
          JSON.stringify({ type: "error", message: "Invalid JSON payload received." })
        );
        return;
      }

      if (payload?.type === "join") {
        const roomId = String(payload.roomId ?? "main").trim() || "main";
        const name = String(payload.name ?? "Guest").trim() || "Guest";

        unregisterPeer(peerRecord);
        peerRecord.roomId = roomId;
        peerRecord.name = name;

        const room = getRoom(roomId);
        const peers = [...room.values()].map(({ id, name: peerName }) => ({
          id,
          name: peerName,
        }));

        room.set(peerRecord.id, peerRecord);
        socket.send(
          JSON.stringify({
            type: "joined",
            peerId: peerRecord.id,
            roomId,
            peers,
          })
        );

        broadcastRoom(
          roomId,
          {
            type: "peer-joined",
            peer: { id: peerRecord.id, name },
          },
          peerRecord.id
        );
        return;
      }

      if (payload?.type === "signal") {
        const room = rooms.get(peerRecord.roomId);
        if (!room || !payload.to || !room.has(payload.to)) return;

        const target = room.get(payload.to);
        if (target.socket.readyState === WebSocket.OPEN) {
          target.socket.send(
            JSON.stringify({
              type: "signal",
              from: peerRecord.id,
              signal: payload.signal,
            })
          );
        }
        return;
      }

      if (payload?.type === "leave") {
        unregisterPeer(peerRecord);
      }
    });

    socket.on("close", () => unregisterPeer(peerRecord));
    socket.on("error", () => unregisterPeer(peerRecord));
  });

  server.on("upgrade", (req, socket, head) => {
    const requestUrl = new URL(req.url ?? "/", `https://${req.headers.host ?? "localhost"}`);
    if (requestUrl.pathname !== "/signal") {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  server.listen(port, host, () => {
    const lanIp = getLanIp();
    const localUrl = `https://localhost:${port}`;
    const lanUrl = lanIp ? `https://${lanIp}:${port}` : localUrl;

    console.log("\n============================================================");
    console.log("   EchoLAN One-click deploy is live.");
    console.log("============================================================\n");
    console.log(`Local Access: ${localUrl}`);
    console.log(`LAN Access:   ${lanUrl}`);

    if (!process.env.RENDER) {
      console.log("\nScan this QR code from your phone (ensure you are on the same WiFi):");
      qrcodeTerminal.generate(lanUrl, { small: true });

      // Advertise service via mDNS
      try {
        bonjour.publish({ name: 'EchoLAN Server', type: 'echolan', protocol: 'tcp', port: port });
        console.log("\nmDNS: Advertising EchoLAN Server on the LAN...");
      } catch (err) {
        console.warn("\nmDNS: Failed to advertise service. This is expected in some sandboxed environments.");
      }
    }

    console.log("\nPress Ctrl+C to stop the server.");
    openBrowser(localUrl);
  });

  server.on("error", (error) => {
    console.error("\n[FATAL] Failed to start the EchoLAN server.");
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use by another application.`);
      console.error(`Try setting a different port: set PORT=5555 && npm start`);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  });
}

async function main() {
  console.log("\n[INFO] Initializing EchoLAN...");

  if (!(await isPortAvailable(port))) {
    console.error(`\n[FATAL] Port ${port} is already in use.`);
    console.error(`Please close the application using this port or use a different PORT environment variable.`);
    process.exit(1);
  }

  // Verification: Build or Install as needed
  await buildIfNeeded();
  await startServer();
}

main().catch((error) => {
  console.error(`\n[FATAL] ${error.message}`);
  process.exit(1);
});
