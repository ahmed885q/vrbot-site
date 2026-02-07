#!/usr/bin/env node
// backend/agent-client.js
// Presence + keepalive + auto reconnect + receive dashboard commands (generic)

const WebSocket = require("ws");
const crypto = require("crypto");

function now() {
  return Date.now();
}

function id() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

const WS_BASE = (process.env.WS_BASE || "ws://127.0.0.1:8787/ws").trim();
const AGENT_TOKEN = (process.env.AGENT_TOKEN || "").trim();
const DEVICE_ID = (process.env.DEVICE_ID || "pc1").trim();
const DEVICE_NAME = (process.env.DEVICE_NAME || "Ahmed-PC").trim();

const AUTO_RECONNECT = (process.env.AUTO_RECONNECT || "1").trim() !== "0";
const HEARTBEAT_MS = Number(process.env.HEARTBEAT_MS || 15000);
const STATUS_EVERY_MS = Number(process.env.STATUS_EVERY_MS || 10000);
const CONNECT_TIMEOUT_MS = Number(process.env.CONNECT_TIMEOUT_MS || 12000);

if (!AGENT_TOKEN) {
  console.error("[agent] Missing AGENT_TOKEN");
  process.exit(1);
}

function normalizeWsBase(input) {
  const v = (input || "").trim();
  if (!v) return "";
  if (v.startsWith("https://")) return "wss://" + v.slice("https://".length);
  if (v.startsWith("http://")) return "ws://" + v.slice("http://".length);
  if (v.startsWith("ws://") || v.startsWith("wss://")) return v;
  return `wss://${v}`;
}

function buildWsUrl(wsBase) {
  const base = normalizeWsBase(wsBase);
  const u = new URL(base);
  u.searchParams.set("role", "agent");
  u.searchParams.set("token", AGENT_TOKEN);
  u.searchParams.set("deviceId", DEVICE_ID);
  u.searchParams.set("name", DEVICE_NAME);
  return u.toString();
}

let ws = null;
let attempt = 0;
let reconnectTimer = null;
let connectTimeoutTimer = null;
let heartbeatTimer = null;
let statusTimer = null;

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function clearTimers() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (connectTimeoutTimer) clearTimeout(connectTimeoutTimer);
  connectTimeoutTimer = null;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  if (statusTimer) clearInterval(statusTimer);
  statusTimer = null;
}

function safeSend(obj) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try {
    ws.send(JSON.stringify(obj));
    return true;
  } catch {
    return false;
  }
}

function scheduleReconnect(reason) {
  if (!AUTO_RECONNECT) return;
  attempt += 1;
  const delay = clamp(1000 * Math.pow(2, attempt - 1), 1000, 15000);
  if (reconnectTimer) clearTimeout(reconnectTimer);

  log(`[agent] reconnect in ${Math.round(delay / 1000)}s (attempt ${attempt}) — ${reason}`);
  reconnectTimer = setTimeout(connect, delay);
}

function sendStatus(kind = "periodic") {
  safeSend({
    type: "agent_status",
    id: id(),
    ts: now(),
    payload: {
      kind,
      deviceId: DEVICE_ID,
      name: DEVICE_NAME,
      uptimeMs: Math.floor(process.uptime() * 1000),
      lastSeen: now(),
    },
  });
}

async function handleDashboardMessage(msg) {
  // Generic commands (no game automation)
  if (msg.type === "dashboard_cmd") {
    const action = msg?.payload?.action;

    if (action === "ping") {
      safeSend({
        type: "agent_pong",
        id: id(),
        ts: now(),
        payload: { ok: true, deviceId: DEVICE_ID, name: DEVICE_NAME, at: now() },
      });
      return;
    }

    if (action === "status") {
      sendStatus("manual");
      return;
    }

    if (action === "echo") {
      safeSend({
        type: "agent_echo",
        id: id(),
        ts: now(),
        payload: { echo: msg.payload, deviceId: DEVICE_ID, name: DEVICE_NAME },
      });
      return;
    }

    safeSend({
      type: "agent_error",
      id: id(),
      ts: now(),
      payload: { message: `Unknown action: ${String(action)}`, received: msg.payload },
    });
  }
}

function connect() {
  clearTimers();

  const wsUrl = buildWsUrl(WS_BASE);
  log("[agent] connecting:", wsUrl);

  try {
    ws = new WebSocket(wsUrl);
  } catch (e) {
    log("[agent] create socket failed:", e?.message || e);
    scheduleReconnect("create socket failed");
    return;
  }

  connectTimeoutTimer = setTimeout(() => {
    log("[agent] connect timeout — terminate");
    try {
      ws.terminate();
    } catch {}
  }, CONNECT_TIMEOUT_MS);

  ws.on("open", () => {
    clearTimeout(connectTimeoutTimer);
    connectTimeoutTimer = null;

    attempt = 0;
    log("[agent] connected ✅");

    heartbeatTimer = setInterval(() => {
      safeSend({ type: "ping", ts: now() });
    }, HEARTBEAT_MS);

    statusTimer = setInterval(() => {
      sendStatus("periodic");
    }, STATUS_EVERY_MS);

    sendStatus("initial");
  });

  ws.on("message", async (buf) => {
    let msg = null;
    try {
      msg = JSON.parse(buf.toString("utf8"));
    } catch {
      return;
    }
    if (!msg?.type) return;

    if (msg.type === "hub_welcome") {
      log("[agent] hub_welcome:", msg.payload?.clientId);
      return;
    }
    if (msg.type === "pong") return;

    // إذا وصلت رسالة من الداشبورد (عبر meta)
    if (msg.meta?.fromRole === "dashboard" || msg.type === "dashboard_cmd") {
      try {
        await handleDashboardMessage(msg);
      } catch (e) {
        log("[agent] handler error:", e?.message || e);
      }
    }
  });

  ws.on("error", (err) => {
    log("[agent] ws error:", err?.message || err);
  });

  ws.on("close", (ev) => {
    log(`[agent] closed code=${ev.code} reason=${ev.reason || "-"}`);
    ws = null;
    scheduleReconnect(`closed (${ev.code})`);
  });
}

function shutdown(sig) {
  log("[agent] shutdown:", sig);
  clearTimers();
  try {
    ws?.close(1000, "shutdown");
  } catch {}
  setTimeout(() => process.exit(0), 250);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

log("[agent] config:", { WS_BASE, DEVICE_ID, DEVICE_NAME, AUTO_RECONNECT });
connect();
