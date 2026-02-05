// backend/ws-server.js
// WS Hub: يربط dashboard <-> agent
// WS URL:
//   ws://127.0.0.1:8787/ws?role=dashboard&token=XXX
//   ws://127.0.0.1:8787/ws?role=agent&token=XXX

"use strict";

const http = require("http");
const crypto = require("crypto");
const { URL } = require("url");
const WebSocket = require("ws");

const PORT = Number(process.env.WS_PORT || 8787);
const HOST = process.env.WS_HOST || "0.0.0.0";

// اختياري: لو تحب تشدد الأمن لاحقاً
// - إذا وضعت WS_TOKEN_ALLOWLIST="tok1,tok2" سيقبل فقط هذه التوكنات
const TOKEN_ALLOWLIST = (process.env.WS_TOKEN_ALLOWLIST || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const HEARTBEAT_INTERVAL_MS = Number(process.env.WS_HEARTBEAT_MS || 25000);
const CLOSE_STALE_AFTER_MS = Number(process.env.WS_STALE_CLOSE_MS || 60000);
const MAX_MESSAGE_BYTES = Number(process.env.WS_MAX_MESSAGE_BYTES || 1_000_000);

// --- State ---
/**
 * peers.dashboard / peers.agent: Set<WebSocket>
 * session maps for tracing/debugging
 */
const peers = {
  dashboard: new Set(),
  agent: new Set(),
};

// --- Helpers ---
function now() {
  return Date.now();
}

function rid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${now()}-${Math.random().toString(16).slice(2)}`;
}

function log(...args) {
  console.log("[ws-hub]", ...args);
}

function warn(...args) {
  console.warn("[ws-hub]", ...args);
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
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

function systemMsg(type, payload = {}, extra = {}) {
  return {
    type,
    id: rid(),
    ts: now(),
    payload,
    ...extra,
  };
}

function countPeers() {
  return {
    dashboards: peers.dashboard.size,
    agents: peers.agent.size,
  };
}

function broadcast(role, obj) {
  const set = peers[role];
  if (!set) return;
  for (const ws of set) safeSend(ws, obj);
}

function broadcastCounts() {
  const counts = countPeers();
  const msg = systemMsg("hub_peers", counts);
  broadcast("dashboard", msg);
  broadcast("agent", msg);
}

function validateToken(token) {
  if (!token || typeof token !== "string" || token.trim().length === 0) return false;
  if (TOKEN_ALLOWLIST.length > 0) return TOKEN_ALLOWLIST.includes(token.trim());
  return true;
}

function normalizeRole(role) {
  const r = (role || "").toString().trim().toLowerCase();
  return r === "dashboard" || r === "agent" ? r : "";
}

function getClientIp(req) {
  // خلف proxies قد يأتي x-forwarded-for
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function closeWith(ws, code, reason) {
  try {
    ws.close(code, reason);
  } catch {}
}

// --- HTTP Server ---
const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (u.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, ts: now(), peers: countPeers() }));
    return;
  }

  if (u.pathname === "/") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end(
      [
        "WS Hub running.",
        "Use websocket on /ws?role=dashboard|agent&token=YOUR_TOKEN",
        `Peers: ${JSON.stringify(countPeers())}`,
        "",
      ].join("\n")
    );
    return;
  }

  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not Found\n");
});

// --- WS Server (noServer) ---
const wss = new WebSocket.Server({
  noServer: true,
  maxPayload: MAX_MESSAGE_BYTES, // حماية من رسائل ضخمة
});

// Heartbeat
function heartbeatTick() {
  const t = now();

  for (const role of ["dashboard", "agent"]) {
    for (const ws of peers[role]) {
      // ws.isAlive يتم تعيينه عند pong
      if (ws.isAlive === false) {
        warn("stale connection terminated", { role, id: ws._id });
        peers[role].delete(ws);
        closeWith(ws, 4000, "Stale connection");
        continue;
      }

      // إذا لم يرسل pong منذ مدة طويلة
      if (ws.lastPongAt && t - ws.lastPongAt > CLOSE_STALE_AFTER_MS) {
        warn("no pong for too long, closing", { role, id: ws._id });
        peers[role].delete(ws);
        closeWith(ws, 4000, "No heartbeat");
        continue;
      }

      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        peers[role].delete(ws);
        closeWith(ws, 1011, "Ping failed");
      }
    }
  }
}

let heartbeatTimer = null;
function startHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(heartbeatTick, HEARTBEAT_INTERVAL_MS);
  heartbeatTimer.unref?.();
}

// Routing: Dashboard <-> Agent
function routeMessage(fromRole, msg, wsMeta) {
  // تجاهل رسائل النظام من العملاء لو جت
  if (!msg || typeof msg !== "object") return;

  // نمرر كما هو، مع إضافة meta مفيدة (اختياري)
  const envelope = {
    ...msg,
    _hub: {
      via: "ws-hub",
      fromRole,
      fromToken: wsMeta?.tokenMasked,
      fromId: wsMeta?.id,
      ts: now(),
    },
  };

  if (fromRole === "dashboard") {
    broadcast("agent", envelope);
  } else if (fromRole === "agent") {
    broadcast("dashboard", envelope);
  }
}

// Upgrade handler
server.on("upgrade", (req, socket, head) => {
  try {
    const u = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (u.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    const role = normalizeRole(u.searchParams.get("role"));
    const token = (u.searchParams.get("token") || "").trim();

    if (!role) {
      socket.destroy();
      return;
    }

    if (!validateToken(token)) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      // attach meta
      ws._id = rid();
      ws.role = role;
      ws.token = token;
      ws.tokenMasked = token.length <= 6 ? token : `${token.slice(0, 3)}***${token.slice(-2)}`;
      ws.ip = getClientIp(req);
      ws.connectedAt = now();
      ws.isAlive = true;
      ws.lastPongAt = now();

      wss.emit("connection", ws, req);
    });
  } catch (e) {
    try {
      socket.destroy();
    } catch {}
  }
});

// connection
wss.on("connection", (ws, req) => {
  const role = ws.role;

  peers[role].add(ws);
  log("connected", {
    role,
    id: ws._id,
    ip: ws.ip,
    token: ws.tokenMasked,
    peers: countPeers(),
  });

  // events
  ws.on("pong", () => {
    ws.isAlive = true;
    ws.lastPongAt = now();
  });

  ws.on("message", (data, isBinary) => {
    // ws lib قد يعطينا Buffer أو string
    if (isBinary) return; // لا نستخدم binary حالياً

    const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
    const msg = safeJsonParse(text);
    if (!msg || !msg.type) return;

    // route
    routeMessage(role, msg, {
      id: ws._id,
      tokenMasked: ws.tokenMasked,
    });
  });

  ws.on("close", (code, reasonBuf) => {
    peers[role].delete(ws);
    const reason = Buffer.isBuffer(reasonBuf) ? reasonBuf.toString("utf8") : String(reasonBuf || "");
    log("closed", { role, id: ws._id, code, reason, peers: countPeers() });
    broadcastCounts();
  });

  ws.on("error", (err) => {
    warn("socket error", { role, id: ws._id, message: err?.message || String(err) });
  });

  // welcome + peers
  safeSend(
    ws,
    systemMsg("hub_welcome", {
      id: ws._id,
      role,
      token: ws.tokenMasked,
      ip: ws.ip,
      connectedAt: ws.connectedAt,
      wsPath: "/ws",
      note: "Send JSON messages like {type: 'x', payload: {...}}",
    })
  );

  broadcastCounts();
});

// Boot
server.listen(PORT, HOST, () => {
  startHeartbeat();
  log(`listening on http://${HOST}:${PORT}`);
  log(`ws: ws://127.0.0.1:${PORT}/ws?role=dashboard&token=XXX`);
  log(`ws: ws://127.0.0.1:${PORT}/ws?role=agent&token=XXX`);
  if (TOKEN_ALLOWLIST.length > 0) log(`token allowlist enabled: ${TOKEN_ALLOWLIST.length} tokens`);
});
