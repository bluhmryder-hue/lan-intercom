#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import qrcodeTerminal from "qrcode-terminal";
import selfsigned from "selfsigned";
import { WebSocket, WebSocketServer } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname;
const distDir = path.join(projectRoot, "dist");
const port = Number.parseInt(process.env.PORT ?? "5173", 10);
const host = "0.0.0.0";
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

class LanServer {
  constructor() {
    this.rooms = new Map();
    this.distRoot = path.resolve(distDir);
    this.distRootPrefix = `${this.distRoot}${path.sep}`;
  }

  async start() {
    const cert = this.makeCertificate();
    this.server = https.createServer(
      {
        key: cert.private,
        cert: cert.cert,
      },
      (req, res) => this.handleHttpRequest(req, res)
    );

    this.wss = new WebSocketServer({ noServer: true });
    this.wss.on("connection", (socket) => this.handleWsConnection(socket));

    this.server.on("upgrade", (req, socket, head) => {
      const requestUrl = new URL(req.url ?? "/", `https://${req.headers.host ?? "localhost"}`);
      if (requestUrl.pathname !== "/signal") {
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.wss.emit("connection", ws, req);
      });
    });

    return new Promise((resolve) => {
      this.server.listen(port, host, () => {
        const lanIp = this.getLanIp();
        const localUrl = `https://localhost:${port}`;
        const lanUrl = lanIp ? `https://${lanIp}:${port}` : localUrl;

        console.log("\nOne-click deploy is live.");
        console.log(`Local URL: ${localUrl}`);
        console.log(`LAN URL:   ${lanUrl}`);
        console.log("\nIf the browser warns about the certificate, continue so camera access can work.");
        console.log("\nScan this QR code from your phone:");
        qrcodeTerminal.generate(lanUrl, { small: true });
        console.log("\nPress Ctrl+C to stop the server.");

        this.openBrowser(localUrl);
        resolve();
      });

      this.server.on("error", (error) => {
        console.error("Failed to start the LAN server.");
        console.error(error);
        process.exit(1);
      });
    });
  }

  async handleHttpRequest(req, res) {
    try {
      const requestUrl = new URL(req.url ?? "/", `https://${req.headers.host ?? "localhost"}`);
      let pathname = decodeURIComponent(requestUrl.pathname);

      if (pathname === "/") {
        pathname = "/index.html";
      }

      let filePath = path.resolve(this.distRoot, `.${pathname}`);
      if (filePath !== this.distRoot && !filePath.startsWith(this.distRootPrefix)) {
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
        filePath = path.join(this.distRoot, "index.html");
      }

      const body = await fsp.readFile(filePath);
      res.writeHead(200, {
        "Content-Length": body.length,
        "Content-Type": this.mimeType(filePath),
      });
      res.end(body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown server error";
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(message);
    }
  }

  handleWsConnection(socket) {
    const peerRecord = {
      id: randomUUID(),
      name: "Guest",
      roomId: "",
      socket,
    };

    socket.on("message", (raw) => this.handleWsMessage(peerRecord, raw));
    socket.on("close", () => this.unregisterPeer(peerRecord));
    socket.on("error", () => this.unregisterPeer(peerRecord));
  }

  handleWsMessage(peerRecord, raw) {
    const socket = peerRecord.socket;
    let payload;
    try {
      payload = JSON.parse(raw.toString());
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Invalid JSON payload received." }));
      return;
    }

    switch (payload?.type) {
      case "join":
        this.handleJoin(peerRecord, payload);
        break;
      case "signal":
        this.handleSignal(peerRecord, payload);
        break;
      case "leave":
        this.unregisterPeer(peerRecord);
        break;
    }
  }

  handleJoin(peerRecord, payload) {
    const roomId = String(payload.roomId ?? "main").trim() || "main";
    const name = String(payload.name ?? "Guest").trim() || "Guest";

    this.unregisterPeer(peerRecord);
    peerRecord.roomId = roomId;
    peerRecord.name = name;

    const room = this.getOrCreateRoom(roomId);
    const peers = [...room.values()].map(({ id, name: peerName }) => ({
      id,
      name: peerName,
    }));

    room.set(peerRecord.id, peerRecord);
    peerRecord.socket.send(
      JSON.stringify({
        type: "joined",
        peerId: peerRecord.id,
        roomId,
        peers,
      })
    );

    this.broadcastToRoom(
      roomId,
      {
        type: "peer-joined",
        peer: { id: peerRecord.id, name },
      },
      peerRecord.id
    );
  }

  handleSignal(peerRecord, payload) {
    const room = this.rooms.get(peerRecord.roomId);
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
  }

  getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }
    return this.rooms.get(roomId);
  }

  broadcastToRoom(roomId, payload, ignorePeerId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const message = JSON.stringify(payload);
    for (const peer of room.values()) {
      if (ignorePeerId && peer.id === ignorePeerId) continue;
      if (peer.socket.readyState === WebSocket.OPEN) {
        peer.socket.send(message);
      }
    }
  }

  unregisterPeer(peerRecord) {
    if (!peerRecord || !peerRecord.roomId) return;

    const room = this.rooms.get(peerRecord.roomId);
    if (!room || !room.has(peerRecord.id)) return;

    room.delete(peerRecord.id);
    this.broadcastToRoom(
      peerRecord.roomId,
      { type: "peer-left", peerId: peerRecord.id },
      peerRecord.id
    );

    if (!room.size) {
      this.rooms.delete(peerRecord.roomId);
    }
  }

  makeCertificate() {
    return selfsigned.generate([{ name: "commonName", value: "lan-p2p-intercom.local" }], {
      algorithm: "sha256",
      days: 1,
      keySize: 2048,
    });
  }

  mimeType(filePath) {
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

  getLanIp() {
    const interfaces = os.networkInterfaces();
    let fallback = null;
    for (const entries of Object.values(interfaces)) {
      if (!entries) continue;
      for (const entry of entries) {
        if (entry.family !== "IPv4" || entry.internal || !entry.address) continue;
        if (this.isPrivateIpv4(entry.address)) return entry.address;
        if (!fallback) fallback = entry.address;
      }
    }
    return fallback;
  }

  isPrivateIpv4(address) {
    return (
      address.startsWith("10.") ||
      address.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
    );
  }

  openBrowser(url) {
    if (process.env.NO_BROWSER === "1") return;
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
      // ignore
    }
  }
}

async function runCommand(command, args, label) {
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
      } else {
        reject(new Error(`${label} failed with exit code ${code}`));
      }
    });
  });
}

async function pathExists(filePath) {
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function installAndBuild() {
  await runCommand(npmCmd, ["install"], "Installing dependencies");
  await runCommand(npmCmd, ["run", "build"], "Building production bundle");
  const indexFile = path.join(distDir, "index.html");
  if (!(await pathExists(indexFile))) {
    throw new Error(`Build output not found: ${indexFile}`);
  }
}

async function main() {
  await installAndBuild();
  const server = new LanServer();
  await server.start();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
