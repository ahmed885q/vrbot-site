const WebSocket = require("ws");

const PORT = process.env.WS_PORT ? Number(process.env.WS_PORT) : 8787;
const wss = new WebSocket.Server({ port: PORT });

/**
 * clients:
 * - dashboard: browser
 * - agent: agent process
 */
const clients = {
  dashboard: new Set(),
  agent: new Set(),
};

function safeSend(ws, obj) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ ...obj, ts: Date.now() }));
}

function broadcast(to, obj) {
  for (const ws of clients[to]) safeSend(ws, obj);
}

wss.on("connection", (ws, req) => {
  // simple role handshake: ws://127.0.0.1:8787/?role=agent OR role=dashboard
  const url = new URL(req.url, `http://${req.headers.host}`);
  const role = url.searchParams.get("role") || "dashboard";

  if (!clients[role]) clients[role] = new Set();
  clients[role].add(ws);

  safeSend(ws, { type: "hub_hello", role });

  ws.on("message", (buf) => {
    let msg;
    try { msg = JSON.parse(buf.toString("utf8")); } catch { return; }

    // Route rules:
    // - dashboard -> agent
    // - agent -> dashboard
    if (role === "dashboard") {
      broadcast("agent", msg);
    } else if (role === "agent") {
      broadcast("dashboard", msg);
    }
  });

  ws.on("close", () => {
    clients[role].delete(ws);
  });
});

console.log(`WS Hub running on ws://127.0.0.1:${PORT}`);
