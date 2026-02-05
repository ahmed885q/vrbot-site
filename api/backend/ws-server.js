// backend/ws-server.js
// WS Hub: Presence + Relay
// ws://127.0.0.1:8787/ws?role=dashboard&token=XXX
// ws://127.0.0.1:8787/ws?role=agent&token=XXX&deviceId=pc1&name=Ahmed-PC

const http = require("http");
const url = require("url");
const WebSocket = require("ws");
const crypto = require("crypto");

const PORT = Number(process.env.WS_PORT || 8787);
const HEARTBEAT_MS = Number(process.env.WS_HEARTBEAT_MS || 20000);

function now() {
  return Date.now();
}

function cryptoId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function safeSend(ws, obj) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try {
    ws.send(JSON.stringify(obj));
    return true;
  } catch {
    return false;
  }
}

const peers = {
  dashboard: new Set(),
  agent: new Set(),
};

function broadcast(role, obj) {
  const set = peers[role];
  if (!set) return;
  for (const ws of set) safeSend(ws, obj);
}

function opposite(role) {
  return role === "dashboard" ? "agent" : "dashboard";
}

// HTTP server
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, ts: now() }));
    return;
  }
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end(
    [
      "WS Hub running.",
      "Use websocket on /ws?role=dashboard|agent&token=...",
      `Example dashboard: ws://127.0.0.1:${PORT}/ws?role=dashboard&token=XXX`,
      `Example agent:     ws://127.0.0.1:${PORT}/ws?role=agent&token=XXX&deviceId=pc1&name=Agent`,
      "",
    ].join("\n")
  );
});

const wss = new WebSocket.Server({ noServer: true });

// heartbeat (ping/pong)
const hb = setInterval(() => {
  for (const role of Object.keys(peers)) {
    for (const ws of peers[role]) {
      if (ws.isAlive === false) {
        try {
          ws.terminate();
        } catch {}
        peers[role].delete(ws);
        // إرسال leave للطرف المقابل إذا كان agent
        if (ws.role === "agent") notifyPresence("peer_leave", ws);
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {}
    }
  }
}, HEARTBEAT_MS);
hb.unref?.();

function notifyPresence(type, ws) {
  broadcast(opposite(ws.role), {
    type,
    id: cryptoId(),
    ts: now(),
    payload: {
      role: ws.role,
      clientId: ws.clientId,
      deviceId: ws.deviceId || null,
      name: ws.name || null,
      lastSeen: ws.lastSeen || now(),
    },
  });
}

// Upgrade
server.on("upgrade", (req, socket, head) => {
  const { pathname, query } = url.parse(req.url, true);
  if (pathname !== "/ws") {
    socket.destroy();
    return;
  }

  const role = String(query.role || "");
  const token = String(query.token || "");
  const deviceId = String(query.deviceId || "");
  const name = String(query.name || "");

  if (!peers[role]) {
    socket.destroy();
    return;
  }

  if (!token) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    ws.role = role;
    ws.token = token;
    ws.clientId = cryptoId();
    ws.deviceId = role === "agent" ? (deviceId || ws.clientId) : "";
    ws.name = role === "agent" ? (name || `Agent-${ws.deviceId}`) : "Dashboard";
    ws.lastSeen = now();
    ws.isAlive = true;

    wss.emit("connection", ws, req);
  });
});

// Connection
wss.on("connection", (ws) => {
  peers[ws.role].add(ws);

  safeSend(ws, {
    type: "hub_welcome",
    id: cryptoId(),
    ts: now(),
    payload: {
      role: ws.role,
      clientId: ws.clientId,
      deviceId: ws.deviceId || null,
      name: ws.name || null,
      serverTs: now(),
    },
  });

  // إذا agent انضم -> بلغ الداشبورد
  notifyPresence("peer_join", ws);

  ws.on("pong", () => {
    ws.isAlive = true;
    ws.lastSeen = now();
  });

  ws.on("message", (buf) => {
    ws.lastSeen = now();

    let msg = null;
    try {
      msg = JSON.parse(buf.toString("utf8"));
    } catch {
      return;
    }
    if (!msg || typeof msg !== "object" || !msg.type) return;

    // دعم ping من العميل
    if (msg.type === "ping") {
      safeSend(ws, { type: "pong", ts: now() });
      return;
    }

    // مرر الرسالة للطرف الآخر مع meta
    const out = {
      ...msg,
      meta: {
        ...(msg.meta || {}),
        fromRole: ws.role,
        fromClientId: ws.clientId,
        fromDeviceId: ws.deviceId,
        fromName: ws.name,
        serverTs: now(),
      },
    };

    broadcast(opposite(ws.role), out);
  });

  ws.on("close", () => {
    peers[ws.role].delete(ws);
    notifyPresence("peer_leave", ws);
  });

  ws.on("error", () => {});
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[ws-hub] listening on http://0.0.0.0:${PORT}`);
  console.log(`[ws-hub] health: http://127.0.0.1:${PORT}/health`);
});
