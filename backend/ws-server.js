/**
 * backend/ws-server.js
 * Production-ready local Hub (WS + HTTP Admin) with:
 * - Device provisioning (C)
 * - Multi-tenant isolation by orgId (B)
 *
 * WS:
 *   ws://127.0.0.1:8787/ws?role=agent|dashboard&token=...
 *
 * HTTP Admin:
 *   POST http://127.0.0.1:8787/admin/provision
 *     { "orgId":"acme", "hostname":"PC-1" }
 *   POST http://127.0.0.1:8787/admin/revoke
 *     { "deviceId":"..." }
 *   POST http://127.0.0.1:8787/admin/dashboard-token
 *     { "orgId":"acme" }
 *   GET  http://127.0.0.1:8787/admin/list?orgId=acme
 *
 * Security:
 * - ADMIN_KEY header required for /admin/*
 *   Header: x-admin-key: <ADMIN_KEY>
 */

const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

// =====================
// Config
// =====================
const PORT = Number(process.env.WS_PORT || 8787);
const HOST = process.env.WS_HOST || "127.0.0.1";

const ADMIN_KEY = process.env.ADMIN_KEY || "change-me-admin-key"; // غيّره
const TOKEN_SECRET = process.env.TOKEN_SECRET || "change-me-token-secret"; // غيّره

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DEVICES_FILE = path.join(DATA_DIR, "devices.json");

const ONLINE_STALE_MS = Number(process.env.ONLINE_STALE_MS || 18_000);
const PING_INTERVAL_MS = Number(process.env.PING_INTERVAL_MS || 8_000);

// =====================
// Helpers
// =====================
function now() {
  return Date.now();
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

function sendJson(res, status, obj) {
  const buf = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": String(buf.length),
  });
  res.end(buf);
}

function base64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlJson(obj) {
  return base64url(JSON.stringify(obj));
}

function hmac(input) {
  return base64url(crypto.createHmac("sha256", TOKEN_SECRET).update(input).digest());
}

function makeToken(payload) {
  const body = base64urlJson(payload);
  const sig = hmac(body);
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return { ok: false, error: "missing token" };
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, error: "invalid token format" };
  const [body, sig] = parts;
  const expected = hmac(body);
  if (!timingSafeEqualStr(sig, expected)) return { ok: false, error: "bad signature" };

  const payload = safeJsonParse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  if (!payload || typeof payload !== "object") return { ok: false, error: "bad payload" };

  if (payload.exp && typeof payload.exp === "number" && now() > payload.exp) {
    return { ok: false, error: "token expired" };
  }

  return { ok: true, payload };
}

function timingSafeEqualStr(a, b) {
  try {
    const ab = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function randId(prefix = "") {
  const r = crypto.randomBytes(16).toString("hex");
  return prefix ? `${prefix}_${r}` : r;
}

// =====================
// Storage (devices.json)
// =====================
function loadDevices() {
  ensureDir(DATA_DIR);
  if (!fs.existsSync(DEVICES_FILE)) {
    fs.writeFileSync(
      DEVICES_FILE,
      JSON.stringify({ devices: [], revoked: [] }, null, 2),
      "utf8"
    );
  }
  const txt = fs.readFileSync(DEVICES_FILE, "utf8");
  const json = safeJsonParse(txt) || { devices: [], revoked: [] };
  if (!Array.isArray(json.devices)) json.devices = [];
  if (!Array.isArray(json.revoked)) json.revoked = [];
  return json;
}

function saveDevices(db) {
  ensureDir(DATA_DIR);
  fs.writeFileSync(DEVICES_FILE, JSON.stringify(db, null, 2), "utf8");
}

function isRevoked(db, tokenId) {
  return db.revoked.includes(tokenId);
}

function upsertDevice(db, device) {
  const idx = db.devices.findIndex((d) => d.deviceId === device.deviceId);
  if (idx === -1) db.devices.push(device);
  else db.devices[idx] = { ...db.devices[idx], ...device };
}

// =====================
// In-memory runtime state
// =====================
/**
 * We keep last runtime snapshot per device:
 * orgId -> Map(deviceId -> state)
 */
const orgState = new Map(); // orgId => Map(deviceId => { ... })

function getOrgMap(orgId) {
  if (!orgState.has(orgId)) orgState.set(orgId, new Map());
  return orgState.get(orgId);
}

function agentOnline(lastSeen) {
  if (!lastSeen) return false;
  return now() - lastSeen <= ONLINE_STALE_MS;
}

// =====================
// HTTP Server (Admin APIs)
// =====================
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

  // health
  if (req.method === "GET" && url.pathname === "/health") {
    return sendJson(res, 200, { ok: true, ts: now() });
  }

  // Admin guard
  if (url.pathname.startsWith("/admin/")) {
    const key = req.headers["x-admin-key"];
    if (!key || String(key) !== ADMIN_KEY) {
      return sendJson(res, 401, { ok: false, error: "unauthorized" });
    }

    // POST /admin/provision
    if (req.method === "POST" && url.pathname === "/admin/provision") {
      const raw = await readBody(req);
      const body = safeJsonParse(raw) || {};
      const orgId = typeof body.orgId === "string" ? body.orgId.trim() : "";
      const hostname = typeof body.hostname === "string" ? body.hostname.trim() : "";

      if (!orgId) return sendJson(res, 400, { ok: false, error: "orgId required" });

      const db = loadDevices();

      const deviceId = randId("dev");
      const tokenId = randId("tok");

      // token payload
      const token = makeToken({
        tid: tokenId,
        role: "agent",
        orgId,
        deviceId,
        exp: now() + 365 * 24 * 60 * 60 * 1000, // سنة
      });

      upsertDevice(db, {
        deviceId,
        orgId,
        hostname: hostname || null,
        tokenId,
        createdAt: now(),
        revoked: false,
      });

      saveDevices(db);

      return sendJson(res, 200, {
        ok: true,
        deviceId,
        orgId,
        token,
        notes: {
          agentEnv: {
            DASHBOARD_WS: `ws://${HOST}:${PORT}/ws?role=agent`,
            AGENT_TOKEN: token,
          },
        },
      });
    }

    // POST /admin/revoke
    if (req.method === "POST" && url.pathname === "/admin/revoke") {
      const raw = await readBody(req);
      const body = safeJsonParse(raw) || {};
      const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";
      if (!deviceId) return sendJson(res, 400, { ok: false, error: "deviceId required" });

      const db = loadDevices();
      const dev = db.devices.find((d) => d.deviceId === deviceId);
      if (!dev) return sendJson(res, 404, { ok: false, error: "device not found" });

      dev.revoked = true;
      if (dev.tokenId && !db.revoked.includes(dev.tokenId)) db.revoked.push(dev.tokenId);

      saveDevices(db);

      return sendJson(res, 200, { ok: true, deviceId });
    }

    // POST /admin/dashboard-token  (توكن للوحة العميل)
    if (req.method === "POST" && url.pathname === "/admin/dashboard-token") {
      const raw = await readBody(req);
      const body = safeJsonParse(raw) || {};
      const orgId = typeof body.orgId === "string" ? body.orgId.trim() : "";
      if (!orgId) return sendJson(res, 400, { ok: false, error: "orgId required" });

      const token = makeToken({
        tid: randId("dash"),
        role: "dashboard",
        orgId,
        exp: now() + 30 * 24 * 60 * 60 * 1000, // 30 يوم
      });

      return sendJson(res, 200, { ok: true, orgId, token });
    }

    // GET /admin/list?orgId=acme
    if (req.method === "GET" && url.pathname === "/admin/list") {
      const orgId = url.searchParams.get("orgId") || "";
      const db = loadDevices();
      const list = orgId ? db.devices.filter((d) => d.orgId === orgId) : db.devices;
      return sendJson(res, 200, { ok: true, count: list.length, devices: list });
    }

    return sendJson(res, 404, { ok: false, error: "not found" });
  }

  // anything else
  return sendJson(res, 404, { ok: false, error: "not found" });
});

// =====================
// WebSocket server
// =====================
const wss = new WebSocket.Server({ noServer: true });

// Track sockets
// socket -> meta
const socketMeta = new Map();

function closeWith(ws, code, reason) {
  try {
    ws.close(code, reason);
  } catch {}
}

function wsSend(ws, obj) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(obj));
}

// Broadcast hub_status for a specific org to dashboards of that org
function pushHubStatus(orgId) {
  const map = getOrgMap(orgId);
  const agents = Array.from(map.values()).map((a) => ({
    deviceId: a.deviceId,
    orgId: a.orgId,
    lastSeen: a.lastSeen || null,
    hostname: a.hostname || null,
    platform: a.platform || null,
    version: a.version || null,
    farms: Array.isArray(a.farms) ? a.farms : [],
    windows: Array.isArray(a.windows) ? a.windows : [],
    tools: a.tools || null,
  }));

  const payload = { agents };

  for (const [ws, meta] of socketMeta.entries()) {
    if (meta.role === "dashboard" && meta.orgId === orgId) {
      wsSend(ws, { type: "hub_status", payload });
    }
  }
}

// Forward event to dashboards within same org
function forwardToDashboards(orgId, type, deviceId, payload) {
  for (const [ws, meta] of socketMeta.entries()) {
    if (meta.role !== "dashboard") continue;
    if (meta.orgId !== orgId) continue;
    wsSend(ws, { type, payload: { deviceId, payload }, ts: now() });
  }
}

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/ws", `http://${req.headers.host || "127.0.0.1"}`);
  const role = (url.searchParams.get("role") || "").trim();
  const token = (url.searchParams.get("token") || "").trim();

  const auth = verifyToken(token);
  if (!auth.ok) return closeWith(ws, 1008, `auth: ${auth.error}`);

  const p = auth.payload;

  if (!p || typeof p !== "object") return closeWith(ws, 1008, "auth: bad payload");

  // validate role from token
  if (p.role !== role) return closeWith(ws, 1008, "auth: role mismatch");

  const orgId = typeof p.orgId === "string" ? p.orgId : "";
  if (!orgId) return closeWith(ws, 1008, "auth: orgId required");

  // revoked check
  const db = loadDevices();
  const tid = typeof p.tid === "string" ? p.tid : "";
  if (tid && isRevoked(db, tid)) return closeWith(ws, 1008, "auth: revoked");

  // agent requires deviceId
  const deviceId = typeof p.deviceId === "string" ? p.deviceId : "";
  if (role === "agent" && !deviceId) return closeWith(ws, 1008, "auth: deviceId required");

  // remember
  socketMeta.set(ws, { role, orgId, deviceId: deviceId || null });
  ws.isAlive = true;

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("close", () => {
    const meta = socketMeta.get(ws);
    socketMeta.delete(ws);

    // mark disconnected
    if (meta?.role === "agent" && meta.orgId && meta.deviceId) {
      const map = getOrgMap(meta.orgId);
      const st = map.get(meta.deviceId);
      if (st) {
        st.connected = false;
        st.lastSeen = now(); // آخر وقت قبل الإغلاق
        map.set(meta.deviceId, st);
      }
      forwardToDashboards(meta.orgId, "agent_disconnected", meta.deviceId, { deviceId: meta.deviceId });
      pushHubStatus(meta.orgId);
    }
  });

  ws.on("message", (buf) => {
    const meta = socketMeta.get(ws);
    const msg = safeJsonParse(buf.toString("utf8"));
    if (!msg || !meta) return;

    // dashboard asks hub status
    if (meta.role === "dashboard" && msg.type === "hub_status") {
      pushHubStatus(meta.orgId);
      return;
    }

    // dashboard forwarding -> agent (same org)
    if (meta.role === "dashboard" && typeof msg.type === "string") {
      const payload = isRecord(msg.payload) ? msg.payload : {};
      const targetDeviceId = typeof payload.deviceId === "string" ? payload.deviceId : "";
      if (!targetDeviceId) return;

      // find the agent socket
      for (const [sock, m] of socketMeta.entries()) {
        if (m.role === "agent" && m.orgId === meta.orgId && m.deviceId === targetDeviceId) {
          // forward as-is (agent expects msg.type/payload/id/ts)
          wsSend(sock, { type: msg.type, payload: payload, id: msg.id || null, ts: msg.ts || now() });
          return;
        }
      }

      // agent offline
      wsSend(ws, {
        type: "error",
        payload: { message: "agent offline", deviceId: targetDeviceId },
        ts: now(),
      });
      return;
    }

    // agent events -> update state + forward to dashboards
    if (meta.role === "agent" && meta.orgId && meta.deviceId) {
      const map = getOrgMap(meta.orgId);
      const st = map.get(meta.deviceId) || { orgId: meta.orgId, deviceId: meta.deviceId };

      st.connected = true;
      st.lastSeen = now();

      if (msg.type === "agent_hello" || msg.type === "agent_status") {
        const payload = isRecord(msg.payload) ? msg.payload : {};
        st.hostname = typeof payload.hostname === "string" ? payload.hostname : st.hostname;
        st.platform = typeof payload.platform === "string" ? payload.platform : st.platform;
        st.version = typeof payload.version === "string" ? payload.version : st.version;
        st.tools = payload.tools || st.tools;

        if (Array.isArray(payload.farms)) st.farms = payload.farms;
        if (Array.isArray(payload.windows)) st.windows = payload.windows;

        map.set(meta.deviceId, st);

        forwardToDashboards(meta.orgId, msg.type, meta.deviceId, payload);
        pushHubStatus(meta.orgId);

        // first connect event
        forwardToDashboards(meta.orgId, "agent_connected", meta.deviceId, { deviceId: meta.deviceId });
        return;
      }

      // store some known messages
      if (msg.type === "windows_list") {
        const payload = isRecord(msg.payload) ? msg.payload : {};
        if (Array.isArray(payload.windows)) st.windows = payload.windows;
        map.set(meta.deviceId, st);
        forwardToDashboards(meta.orgId, "windows_list", meta.deviceId, payload);
        pushHubStatus(meta.orgId);
        return;
      }

      if (msg.type === "farm_status") {
        const payload = isRecord(msg.payload) ? msg.payload : {};
        // update farms list by id if possible
        if (payload && typeof payload.id === "string") {
          const farms = Array.isArray(st.farms) ? st.farms : [];
          const idx = farms.findIndex((f) => f && f.id === payload.id);
          if (idx === -1) farms.unshift(payload);
          else farms[idx] = { ...farms[idx], ...payload };
          st.farms = farms;
          map.set(meta.deviceId, st);
        }
        forwardToDashboards(meta.orgId, "farm_status", meta.deviceId, payload);
        pushHubStatus(meta.orgId);
        return;
      }

      if (msg.type === "stream_status") {
        const payload = isRecord(msg.payload) ? msg.payload : {};
        st.stream = payload;
        map.set(meta.deviceId, st);
        forwardToDashboards(meta.orgId, "stream_status", meta.deviceId, payload);
        return;
      }

      if (msg.type === "update_progress" || msg.type === "update_done" || msg.type === "update_error") {
        const payload = isRecord(msg.payload) ? msg.payload : {};
        forwardToDashboards(meta.orgId, msg.type, meta.deviceId, payload);
        return;
      }

      if (msg.type === "log") {
        const payload = isRecord(msg.payload) ? msg.payload : {};
        forwardToDashboards(meta.orgId, "log", meta.deviceId, payload);
        return;
      }

      // default: forward raw agent messages
      const payload = isRecord(msg.payload) ? msg.payload : {};
      forwardToDashboards(meta.orgId, msg.type || "agent_event", meta.deviceId, payload);
      return;
    }
  });

  // initial status
  if (role === "dashboard") {
    wsSend(ws, { type: "hub_status", payload: { agents: [] }, ts: now() });
    pushHubStatus(orgId);
  }

  if (role === "agent") {
    // mark connected
    const map = getOrgMap(orgId);
    map.set(deviceId, {
      ...(map.get(deviceId) || {}),
      orgId,
      deviceId,
      connected: true,
      lastSeen: now(),
    });
    pushHubStatus(orgId);
  }
});

// Ping loop
setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    if (ws.isAlive === false) {
      try {
        ws.terminate();
      } catch {}
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {}
  }
}, PING_INTERVAL_MS);

// Start
server.listen(PORT, HOST, () => {
  console.log(`[ws-server] listening on http://${HOST}:${PORT}`);
  console.log(`[ws-server] ws endpoint: ws://${HOST}:${PORT}/ws`);
  console.log(`[ws-server] admin: POST /admin/provision (x-admin-key required)`);
});
