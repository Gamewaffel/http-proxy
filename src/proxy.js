require("dotenv").config();
const http = require("http");
const httpProxy = require("http-proxy");

const PORT = parseInt(process.env.PORT || "8080", 10);
const TARGET = process.env.TARGET || "http://localhost:3000";
const LOG_LEVEL = process.env.LOG_LEVEL || "verbose";

const log = (...args) => {
  if (LOG_LEVEL !== "silent") console.log(new Date().toISOString(), ...args);
};

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  selfHandleResponse: false,
});

proxy.on("proxyReq", (proxyReq, req) => {
  log(`-> ${req.method} ${req.url} -> ${TARGET}${req.url}`);
});

proxy.on("proxyRes", (proxyRes, req) => {
  log(`<- ${proxyRes.statusCode} ${req.method} ${req.url}`);
});

proxy.on("error", (err, req, res) => {
  console.error("Proxy error:", err.message);
  if (!res.headersSent) {
    res.writeHead(502, { "Content-Type": "application/json" });
  }
  res.end(JSON.stringify({ error: "Bad Gateway", detail: err.message }));
});

const server = http.createServer((req, res) => {
  const target = req.headers["x-proxy-target"] || TARGET;
  proxy.web(req, res, { target });
});

server.listen(PORT, () => {
  log("HTTP proxy listening on http://0.0.0.0:" + PORT);
  log("Default upstream target: " + TARGET);
});

const shutdown = (signal) => {
  log("Received " + signal + ", shutting down...");
  server.close(() => {
    log("Server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

module.exports = server;
