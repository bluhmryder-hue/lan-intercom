import sys

content = open('oneclick-deploy.mjs').read()

# Add missing imports at the top
old_imports = 'import { WebSocket, WebSocketServer } from "ws";'
new_imports = 'import { WebSocket, WebSocketServer } from "ws";\nimport { Server as HttpServer } from "node:http";'
content = content.replace(old_imports, new_imports)

# Fix the isRender scope issue by moving the check or passing it
old_start_method = """  async start() {
    const isRender = process.env.RENDER === "true";
    if (isRender) {
      // In Render, SSL is handled at the edge, so we use plain HTTP
      const http = await import("node:http");
      this.server = http.createServer((req, res) => this.handleHttpRequest(req, res));
    } else {"""

new_start_method = """  async start() {
    const isRender = process.env.RENDER === "true";
    if (isRender) {
      // In Render, SSL is handled at the edge, so we use plain HTTP
      const http = await import("node:http");
      this.server = http.createServer((req, res) => this.handleHttpRequest(req, res));
    } else {"""

# Actually the previous replacement was okay but I should make sure isRender is available in the listen callback
# The listen callback is defined inside start(), so it should have access to isRender.

# Let's check if there are any other issues.
# I will just rewrite the start method carefully to ensure all variables are in scope.

start_method_replacement = """  async start() {
    const isRender = process.env.RENDER === "true";
    if (isRender) {
      const http = await import("node:http");
      this.server = http.createServer((req, res) => this.handleHttpRequest(req, res));
    } else {
      const cert = this.makeCertificate();
      this.server = https.createServer(
        {
          key: cert.private,
          cert: cert.cert,
        },
        (req, res) => this.handleHttpRequest(req, res)
      );
    }

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
        const protocol = isRender ? "http" : "https";
        const localUrl = `${protocol}://localhost:${port}`;
        const lanUrl = lanIp ? `${protocol}://${lanIp}:${port}` : localUrl;

        console.log("\\nOne-click deploy is live.");
        if (isRender) {
          console.log(`Server listening on port ${port}`);
        } else {
          console.log(`Local URL: ${localUrl}`);
          console.log(`LAN URL:   ${lanUrl}`);
          console.log("\\nIf the browser warns about the certificate, continue so camera access can work.");
          console.log("\\nScan this QR code from your phone:");
          qrcodeTerminal.generate(lanUrl, { small: true });
          console.log("\\nPress Ctrl+C to stop the server.");
          this.openBrowser(localUrl);
        }
        resolve();
      });

      this.server.on("error", (error) => {
        console.error("Failed to start the LAN server.");
        console.error(error);
        process.exit(1);
      });
    });
  }"""

# Since I already have a messy file from previous sed/python, I'll just rewrite the whole file to be safe.
