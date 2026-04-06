import https from "node:https";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const port = Number.parseInt(process.env.PORT ?? "5173", 10);
const host = "0.0.0.0";
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const isRender = process.env.RENDER === "true" || !!process.env.RENDER;

function runCommand(command, args, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n${label}...`);
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed with exit code ${code}`));
    });
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
    if (!entries) {
      continue;
    }

    for (const entry of entries) {
      if (entry.family !== "IPv4" || entry.internal || !entry.address) {
        continue;
      }

      if (isPrivateIpv4(entry.address)) {
        return entry.address;
      }

      if (!fallback) {
        fallback = entry.address;
      }
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
  if (process.env.NO_BROWSER === "1" || isRender) {
    return;
  }

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
    // If the desktop browser cannot be opened, the URLs and QR code still work.
  }
}

async function installAndBuild() {
  const nodeModulesExist = await pathExists(path.join(projectRoot, "node_modules"));
  const distExists = await pathExists(path.join(distDir, "index.html"));

  if (isRender && distExists) {
    console.log("\nDetected Render environment and existing build. Skipping install/build steps.");
    return;
  }

  if (!nodeModulesExist) {
    await runCommand(npmCmd, ["install"], "Installing dependencies");
  } else {
    console.log("\nSkipping npm install (node_modules already exists)");
  }

  if (!distExists) {
    await runCommand(npmCmd, ["run", "build"], "Building production bundle");
  } else {
    console.log("\nSkipping build (dist/index.html already exists)");
  }

  const indexFile = path.join(distDir, "index.html");
  if (!(await pathExists(indexFile))) {
    throw new Error(`Build output not found: ${indexFile}`);
  }
}

async function startServer() {
  // Dynamically import dependencies that were just installed
  const qrcodeTerminal = (await import("qrcode-terminal")).default;
  const selfsigned = (await import("selfsigned")).default;
  const { WebSocket, WebSocketServer } = await import("ws");

  const root = path.resolve(distDir);
  const rootPrefix = `${root}${path.sep}`;
  const rooms = new Map();

  const cert = selfsigned.generate(
    [{ name: "commonName", value: "lan-p2p-intercom.local" }],
    {
      algorithm: "sha256",
      days: 1,
      keySize: 2048,
    }
  );

  const server = https.createServer(
    {
      key: cert.private,
      cert: cert.cert,
    },
    async (req, res) => {
      try {
        const requestUrl = new URL(req.url ?? "/", `https://${req.headers.host ?? "localhost"}`);
        let pathname = decodeURIComponent(requestUrl.pathname);

        if (pathname === "/") {
          pathname = "/index.html";
        }

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
    if (!room) {
      return;
    }

    const message = JSON.stringify(payload);
    for (const peer of room.values()) {
      if (ignorePeerId && peer.id === ignorePeerId) {
        continue;
      }
      if (peer.socket.readyState === WebSocket.OPEN) {
        peer.socket.send(message);
      }
    }
  };

  const unregisterPeer = (peerRecord) => {
    if (!peerRecord || !peerRecord.roomId) {
      return;
    }

    const room = rooms.get(peerRecord.roomId);
    if (!room || !room.has(peerRecord.id)) {
      return;
    }

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
        if (!room || !payload.to || !room.has(payload.to)) {
          return;
        }

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

    console.log("\nOne-click deploy is live.");
    console.log(`Local URL: ${localUrl}`);
    console.log(`LAN URL:   ${lanUrl}`);

    if (isRender) {
      console.log("\nService is running on Render.");
    } else {
      console.log("\nIf the browser warns about the certificate, continue so camera access can work.");
      console.log("\nScan this QR code from your phone:");
      qrcodeTerminal.generate(lanUrl, { small: true });
      openBrowser(localUrl);
    }

    console.log("\nPress Ctrl+C to stop the server.");
  });

  server.on("error", (error) => {
    console.error("Failed to start the LAN server.");
    console.error(error);
    process.exitCode = 1;
  });
}

async function main() {
  await installAndBuild();
  await startServer();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
