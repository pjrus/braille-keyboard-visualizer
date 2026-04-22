// Zero-dependency static file server.
// Run: `node server.js` or `npm start`
// Then open: http://localhost:5173

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 5173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".map":  "application/json; charset=utf-8",
};

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({ "Cache-Control": "no-store" }, headers || {}));
  res.end(body);
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";

    // Prevent path traversal
    const resolved = path.normalize(path.join(ROOT, pathname));
    if (!resolved.startsWith(ROOT)) return send(res, 403, "Forbidden");

    fs.stat(resolved, (err, stat) => {
      if (err || !stat.isFile()) return send(res, 404, "Not found");
      const ext = path.extname(resolved).toLowerCase();
      const type = MIME[ext] || "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": type,
        "Content-Length": stat.size,
        "Cache-Control": "no-store",
      });
      fs.createReadStream(resolved).pipe(res);
    });
  } catch (e) {
    send(res, 500, "Server error");
  }
});

server.listen(PORT, () => {
  console.log(`Braille Keyboard Visualizer`);
  console.log(`  → http://localhost:${PORT}`);
});
