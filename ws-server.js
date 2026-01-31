// backend/ws-server.js
// WS Hub: يربط dashboard <-> agent
// URL: ws://127.0.0.1:8787/ws?role=dashboard
//      ws://127.0.0.1:8787/ws?role=agent
const url = require("url");

const http = require("http");
const WebSocket = require("ws");

const PORT = Number(process.env.WS_PORT || 8787);

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, ts: Date.now() }));
    return;
  }
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("WS Hub running.\nUse websocket on /ws?role=dashboard|agent\n");
});

const wss = new WebSocket.Server({ noServer: true });

wss.on("connection", (ws, req) => {
 const parsed = url.parse(req.url, true);
const { role, token } = parsed.query;

if (!token) {
  ws.close(4001, "Missing token");
  return;
}

// TODO لاحقًا: تحقق JWT حقيقي
ws.deviceToken = token;
ws.role = role;

});

// role -> Set(ws)
const peers = {
  dashboard: new Set(),
  agent: new Set(),
};

function safeSend(ws, obj) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify(obj));
  return true;
}

function broadcast(role, obj) {
  const set = peers[role];
  if (!set) return;
  for (const ws of set) safeSend(ws, obj);
}

function routeMessage(fromRole, msg) {
  // افتراضياً:
  // - أي رسالة من dashboard تروح للـ agent
  // - أي رسالة من agent تروح للـ dashboard
  if (fromRole === "dashboard") {
    broadcast("agent", msg);
  } else if (fromRole === "agent") {
    broadcast("dashboard", msg);
  }
}

server.on("upgrade", (req, socket, head) => {
  const { pathname, query } = url.parse(req.url, true);
  if (pathname !== "/ws") {
    socket.destroy();
    return;
  }

  const role = (query.role || "").toString();
  if (!peers[role]) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    ws.role = role;
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws) => {
  const role = ws.role;
  peers[role].add(ws);

  safeSend(ws, {
    type: "hub_welcome",
    payload: { role, ts: Date.now() },
    id: cryptoRandomId(),
    ts: Date.now(),
  });

  ws.on("message", (buf) => {
    let msg = null;
    try {
      msg = JSON.parse(buf.toString("utf8"));
    } catch {
      return;
    }
    if (!msg || !msg.type) return;
    routeMessage(role, msg);
  });

  ws.on("close", () => {
    peers[role].delete(ws);
  });

  ws.on("error", () => {});
});

function cryptoRandomId() {
  try {
    return require("crypto").randomUUID();
  } catch {
    return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
  }
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[ws-hub] listening on http://0.0.0.0:${PORT}`);
  console.log(`[ws-hub] ws: ws://127.0.0.1:${PORT}/ws?role=dashboard`);
  console.log(`[ws-hub] ws: ws://127.0.0.1:${PORT}/ws?role=agent`);
});
