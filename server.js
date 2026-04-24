const express = require("express");
const path = require("path");
const fs = require("fs");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 5173;
const RELOAD_PATH = "/__live-reload";
const RELOAD_CLIENT_PATH = "/__live-reload.js";
const WATCHABLE_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".mjs"]);
const POLL_INTERVAL_MS = 300;
const clients = new Set();

const app = express();

app.get(RELOAD_CLIENT_PATH, function (_req, res) {
  res.type("js");
  res.set("Cache-Control", "no-store");
  res.send(`
const source = new EventSource("${RELOAD_PATH}");

source.addEventListener("reload", function () {
  window.location.reload();
});

source.onerror = function () {
  source.close();
  window.setTimeout(function () {
    window.location.reload();
  }, 500);
};
`);
});

app.get(RELOAD_PATH, function (req, res) {
  res.set({
    "Cache-Control": "no-store",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
  });
  res.flushHeaders();
  res.write("retry: 500\n\n");

  clients.add(res);
  req.on("close", function () {
    clients.delete(res);
  });
});

app.use(function (_req, res, next) {
  res.set("Cache-Control", "no-store");
  next();
});

app.use(express.static(ROOT, { extensions: ["html"] }));

app.use(function (_req, res) {
  res.sendFile(path.join(ROOT, "index.html"));
});

const server = app.listen(PORT, function () {
  console.log(`Braille Keyboard Visualizer`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  → live reload enabled`);
});

let reloadTimer = null;
let fileSnapshot = createFileSnapshot(ROOT);
const pollTimer = setInterval(function () {
  const nextSnapshot = createFileSnapshot(ROOT);

  if (hasSnapshotChanged(fileSnapshot, nextSnapshot)) {
    scheduleReload();
  }

  fileSnapshot = nextSnapshot;
}, POLL_INTERVAL_MS);

function shouldReload(filename) {
  if (!filename) {
    return false;
  }

  const normalised = String(filename).replace(/\\/g, "/");
  if (
    normalised.startsWith("node_modules/") ||
    normalised.startsWith(".git/") ||
    normalised === "package-lock.json"
  ) {
    return false;
  }

  return WATCHABLE_EXTENSIONS.has(path.extname(normalised).toLowerCase());
}

function broadcastReload() {
  clients.forEach(function (client) {
    client.write("event: reload\ndata: now\n\n");
  });
}

function scheduleReload() {
  if (reloadTimer) {
    clearTimeout(reloadTimer);
  }

  reloadTimer = setTimeout(function () {
    broadcastReload();
    reloadTimer = null;
  }, 120);
}

function createFileSnapshot(directory) {
  const snapshot = new Map();
  visitFiles(directory, snapshot);
  return snapshot;
}

function visitFiles(directory, snapshot) {
  let entries = [];

  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }

  entries.forEach(function (entry) {
    if (entry.name === ".git" || entry.name === "node_modules") {
      return;
    }

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visitFiles(fullPath, snapshot);
      return;
    }

    const relativePath = path.relative(ROOT, fullPath).replace(/\\/g, "/");
    if (!shouldReload(relativePath)) {
      return;
    }

    try {
      const stats = fs.statSync(fullPath);
      snapshot.set(relativePath, stats.mtimeMs);
    } catch {
      // Ignore files that disappear mid-scan.
    }
  });
}

function hasSnapshotChanged(previousSnapshot, nextSnapshot) {
  if (previousSnapshot.size !== nextSnapshot.size) {
    return true;
  }

  for (const [filePath, modifiedTime] of previousSnapshot.entries()) {
    if (nextSnapshot.get(filePath) !== modifiedTime) {
      return true;
    }
  }

  return false;
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  clearInterval(pollTimer);
  server.close(function () {
    process.exit(0);
  });
}
