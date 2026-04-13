const http = require("http");
const { spawn } = require("child_process");
const net = require("net");

const PUBLIC_PORT = parseInt(process.env.PORT || "22317", 10);
const METRO_PORT = PUBLIC_PORT + 1;

function waitForPort(port, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const sock = new net.Socket();
      sock.setTimeout(500);
      sock.once("connect", () => { sock.destroy(); resolve(); });
      sock.once("error", () => {
        sock.destroy();
        if (Date.now() - start > timeout) return reject(new Error("timeout"));
        setTimeout(check, 500);
      });
      sock.once("timeout", () => {
        sock.destroy();
        if (Date.now() - start > timeout) return reject(new Error("timeout"));
        setTimeout(check, 500);
      });
      sock.connect(port, "127.0.0.1");
    };
    check();
  });
}

const env = { ...process.env, PORT: String(METRO_PORT) };
const expo = spawn(
  "pnpm", ["exec", "expo", "start", "--localhost", "--port", String(METRO_PORT)],
  { stdio: "inherit", env, cwd: __dirname + "/.." }
);
expo.on("exit", (code) => process.exit(code ?? 1));

const EXTRA_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS, POST",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
  "X-Frame-Options": "ALLOWALL",
  "Content-Security-Policy": "default-src * 'unsafe-inline' 'unsafe-eval' data: blob: ws: wss:; img-src * data: blob:; font-src * data:; connect-src * ws: wss:; script-src * 'unsafe-inline' 'unsafe-eval' blob:; style-src * 'unsafe-inline';",
};

const proxy = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, EXTRA_HEADERS);
    res.end();
    return;
  }

  const proxyReq = http.request(
    { hostname: "127.0.0.1", port: METRO_PORT, path: req.url, method: req.method, headers: req.headers },
    (proxyRes) => {
      const headers = { ...proxyRes.headers };
      Object.entries(EXTRA_HEADERS).forEach(([k, v]) => { headers[k] = v; });
      delete headers["x-content-type-options"];
      res.writeHead(proxyRes.statusCode || 200, headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on("error", (err) => {
    res.writeHead(502, EXTRA_HEADERS);
    res.end("Bad Gateway: " + err.message);
  });
  req.pipe(proxyReq);
});

const wsProxy = (req, socket, head) => {
  const proxySocket = new net.Socket();
  proxySocket.connect(METRO_PORT, "127.0.0.1", () => {
    const reqLine = `${req.method} ${req.url} HTTP/1.1\r\n`;
    const hdrs = Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join("\r\n");
    proxySocket.write(reqLine + hdrs + "\r\n\r\n");
    if (head && head.length) proxySocket.write(head);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  proxySocket.on("error", () => socket.destroy());
  socket.on("error", () => proxySocket.destroy());
};
proxy.on("upgrade", wsProxy);

console.log("Waiting for Metro on port " + METRO_PORT + "...");
waitForPort(METRO_PORT).then(() => {
  proxy.listen(PUBLIC_PORT, "0.0.0.0", () => {
    console.log("CORS proxy listening on port " + PUBLIC_PORT + " -> Metro " + METRO_PORT);
  });
}).catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});

process.on("SIGTERM", () => { expo.kill("SIGTERM"); process.exit(0); });
process.on("SIGINT", () => { expo.kill("SIGINT"); process.exit(0); });
