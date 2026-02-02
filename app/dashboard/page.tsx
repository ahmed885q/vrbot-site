"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type WsStatus = "idle" | "connecting" | "online" | "offline" | "error";

type HubMsg = {
  type: string;
  id?: string;
  ts?: number;
  payload?: any;
  meta?: any;
};

type AgentPeer = {
  clientId: string;
  deviceId?: string;
  name?: string;
  lastSeen?: number;
  status: "online" | "offline";
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function fmtTime(ts?: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

function msAgo(ts?: number) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  if (diff < 1000) return `${diff}ms`;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

function normalizeWsBase(input: string): string {
  const v = (input || "").trim();
  if (!v) return "";
  if (v.startsWith("https://")) return "wss://" + v.slice("https://".length);
  if (v.startsWith("http://")) return "ws://" + v.slice("http://".length);
  if (v.startsWith("ws://") || v.startsWith("wss://")) return v;
  return `wss://${v}`;
}

function buildWsUrl(wsBase: string, params: Record<string, string>) {
  const base = normalizeWsBase(wsBase);
  const u = new URL(base);
  Object.entries(params).forEach(([k, val]) => {
    if (val && val.trim().length > 0) u.searchParams.set(k, val.trim());
  });
  return u.toString();
}

export default function DashboardPage() {
  const envBase = (process.env.NEXT_PUBLIC_WS_BASE || "").trim();
  const [wsBase, setWsBase] = useState<string>("");
  const [token, setToken] = useState<string>("change-me");

  const [status, setStatus] = useState<WsStatus>("idle");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [autoReconnect, setAutoReconnect] = useState<boolean>(true);

  const [welcome, setWelcome] = useState<any>(null);
  const [agents, setAgents] = useState<Record<string, AgentPeer>>({});
  const [logs, setLogs] = useState<string[]>([]);

  const [outType, setOutType] = useState<string>("dashboard_cmd");
  const [outPayload, setOutPayload] = useState<string>('{"action":"ping"}');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<any>(null);
  const attemptRef = useRef<number>(0);

  const effectiveWsBase = useMemo(() => {
    return wsBase.trim() || envBase || "ws://127.0.0.1:8787/ws";
  }, [wsBase, envBase]);

  function pushLog(line: string) {
    setLogs((prev) => [line, ...prev].slice(0, 300));
  }

  function clearReconnectTimer() {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }

  function setAgentOnline(payload: any) {
    const clientId = String(payload?.clientId || "");
    if (!clientId) return;

    setAgents((prev) => {
      const current = prev[clientId];
      const next: AgentPeer = {
        clientId,
        deviceId: payload?.deviceId || current?.deviceId,
        name: payload?.name || current?.name,
        lastSeen: payload?.lastSeen || Date.now(),
        status: "online",
      };
      return { ...prev, [clientId]: next };
    });
  }

  function setAgentOffline(payload: any) {
    const clientId = String(payload?.clientId || "");
    if (!clientId) return;

    setAgents((prev) => {
      const current = prev[clientId];
      if (!current) return prev;
      return { ...prev, [clientId]: { ...current, status: "offline", lastSeen: payload?.lastSeen || current.lastSeen } };
    });
  }

  function markAllOffline() {
    setAgents((prev) => {
      const out: Record<string, AgentPeer> = {};
      Object.values(prev).forEach((a) => (out[a.clientId] = { ...a, status: "offline" }));
      return out;
    });
  }

  function scheduleReconnect(reason: string) {
    if (!autoReconnect) return;

    attemptRef.current += 1;
    const delay = clamp(1000 * Math.pow(2, attemptRef.current - 1), 1000, 15000);
    clearReconnectTimer();

    setStatus("offline");
    setStatusMsg(`${reason} — reconnect in ${Math.round(delay / 1000)}s`);
    pushLog(`[reconnect] ${reason} | attempt=${attemptRef.current} | delay=${delay}ms`);

    reconnectTimerRef.current = setTimeout(() => connect(), delay);
  }

  function disconnect(reason = "manual disconnect") {
    clearReconnectTimer();
    attemptRef.current = 0;

    try {
      wsRef.current?.close(1000, reason);
    } catch {}
    wsRef.current = null;

    setStatus("offline");
    setStatusMsg(reason);
    markAllOffline();
    pushLog(`[ws] disconnected (${reason})`);
  }

  function connect() {
    if (!token.trim()) {
      setStatus("error");
      setStatusMsg("Token is required");
      return;
    }

    clearReconnectTimer();

    const wsUrl = buildWsUrl(effectiveWsBase, { role: "dashboard", token: token.trim() });

    try {
      wsRef.current?.close(1000, "reconnect");
    } catch {}

    setStatus("connecting");
    setStatusMsg("Connecting…");
    pushLog(`[ws] connecting: ${wsUrl}`);

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e: any) {
      setStatus("error");
      setStatusMsg(String(e?.message || e));
      scheduleReconnect("create socket failed");
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("online");
      setStatusMsg("Connected ✅");
      attemptRef.current = 0;
      pushLog("[ws] connected ✅");
      try {
        ws.send(JSON.stringify({ type: "ping", ts: Date.now() }));
      } catch {}
    };

    ws.onmessage = (ev) => {
      let msg: HubMsg | null = null;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (!msg?.type) return;

      if (msg.type === "hub_welcome") {
        setWelcome(msg.payload || null);
        pushLog(`[hub] welcome clientId=${msg.payload?.clientId}`);
        return;
      }

      if (msg.type === "peer_join" && msg.payload?.role === "agent") {
        setAgentOnline({ ...msg.payload, lastSeen: Date.now() });
        pushLog(`[peer] agent joined: ${msg.payload?.name || msg.payload?.deviceId || msg.payload?.clientId}`);
        return;
      }

      if (msg.type === "peer_leave" && msg.payload?.role === "agent") {
        setAgentOffline({ ...msg.payload, lastSeen: Date.now() });
        pushLog(`[peer] agent left: ${msg.payload?.name || msg.payload?.deviceId || msg.payload?.clientId}`);
        return;
      }

      // تحديث last seen لو رسالة من agent
      if (msg.meta?.fromRole === "agent") {
        setAgentOnline({
          clientId: msg.meta?.fromClientId,
          deviceId: msg.meta?.fromDeviceId,
          name: msg.meta?.fromName,
          lastSeen: Date.now(),
        });
      }

      pushLog(`[in] ${msg.type} ${msg.meta?.fromRole ? `(from ${msg.meta.fromRole})` : ""}`);
    };

    ws.onerror = () => {
      setStatus("error");
      setStatusMsg("WebSocket error");
      pushLog("[ws] error");
    };

    ws.onclose = (ev) => {
      wsRef.current = null;
      markAllOffline();
      pushLog(`[ws] closed code=${ev.code} reason=${ev.reason || "-"}`);
      setStatus("offline");
      setStatusMsg(`Closed (${ev.code})`);
      scheduleReconnect(`Closed (${ev.code})`);
    };
  }

  function sendMessage() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      pushLog("[out] not connected");
      return;
    }

    let payloadObj: any = null;
    try {
      payloadObj = JSON.parse(outPayload);
    } catch {
      payloadObj = outPayload;
    }

    const msg: HubMsg = { type: outType.trim() || "dashboard_cmd", ts: Date.now(), payload: payloadObj };

    try {
      ws.send(JSON.stringify(msg));
      pushLog(`[out] ${msg.type}`);
    } catch {
      pushLog("[out] send failed");
    }
  }

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("vrbot_dashboard_token");
      const savedBase = localStorage.getItem("vrbot_ws_base");
      if (savedToken) setToken(savedToken);
      if (savedBase) setWsBase(savedBase);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("vrbot_dashboard_token", token);
    } catch {}
  }, [token]);

  useEffect(() => {
    try {
      localStorage.setItem("vrbot_ws_base", wsBase);
    } catch {}
  }, [wsBase]);

  useEffect(() => {
    return () => {
      clearReconnectTimer();
      try {
        wsRef.current?.close(1000, "unmount");
      } catch {}
    };
  }, []);

  const agentList = useMemo(() => {
    const arr = Object.values(agents);
    arr.sort((a, b) => {
      if (a.status !== b.status) return a.status === "online" ? -1 : 1;
      return (b.lastSeen || 0) - (a.lastSeen || 0);
    });
    return arr;
  }, [agents]);

  const onlineCount = agentList.filter((a) => a.status === "online").length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl bg-white shadow-sm border p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">Presence • Auto-Reconnect • Live Agents</p>
            </div>
            <div className="text-sm text-gray-700 font-semibold">{status} • {statusMsg}</div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <label className="text-sm font-semibold text-gray-700">WS Base</label>
              <input
                value={wsBase}
                onChange={(e) => setWsBase(e.target.value)}
                placeholder={effectiveWsBase}
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
              <p className="mt-1 text-xs text-gray-500">اتركه فارغًا لاستخدام NEXT_PUBLIC_WS_BASE أو local.</p>
            </div>

            <div className="md:col-span-4">
              <label className="text-sm font-semibold text-gray-700">Token</label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="md:col-span-3 flex flex-col justify-end gap-2">
              <div className="flex items-center justify-between rounded-xl border bg-gray-50 px-3 py-2">
                <span className="text-sm font-semibold text-gray-700">Auto-Reconnect</span>
                <input type="checkbox" checked={autoReconnect} onChange={(e) => setAutoReconnect(e.target.checked)} />
              </div>

              <div className="flex gap-2">
                <button onClick={connect} className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Connect</button>
                <button onClick={() => disconnect()} className="flex-1 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">Disconnect</button>
              </div>
            </div>
          </div>

          {welcome && (
            <div className="mt-4 rounded-xl border bg-gray-50 p-3 text-sm text-gray-700">
              <div className="font-semibold">Session</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3 mt-2">
                <div><span className="text-gray-500">clientId:</span> {welcome.clientId}</div>
                <div><span className="text-gray-500">role:</span> {welcome.role}</div>
                <div><span className="text-gray-500">serverTs:</span> {fmtTime(welcome.serverTs)}</div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl bg-white shadow-sm border p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Agents</h2>
                <span className="rounded-full border bg-gray-50 px-3 py-1 text-sm font-semibold text-gray-700">
                  Online: {onlineCount} / {agentList.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {agentList.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-gray-600">
                    لا يوجد Agents متصلين. شغّل خدمة VRBOT-AGENT.
                  </div>
                ) : (
                  agentList.map((a) => (
                    <div key={a.clientId} className="rounded-xl border p-3 hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-900">{a.name || a.deviceId || a.clientId}</div>
                        <span className={a.status === "online"
                          ? "text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full"
                          : "text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 px-2 py-1 rounded-full"}>
                          {a.status}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                        <div><span className="text-gray-500">deviceId:</span> <span className="font-mono">{a.deviceId || "—"}</span></div>
                        <div><span className="text-gray-500">last seen:</span> {msAgo(a.lastSeen)} ago</div>
                        <div className="md:col-span-2"><span className="text-gray-500">clientId:</span> <span className="font-mono">{a.clientId}</span></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow-sm border p-5">
              <h2 className="text-lg font-bold text-gray-900">Send</h2>
              <p className="mt-1 text-sm text-gray-600">رسائل عامة إلى agents عبر hub.</p>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Type</label>
                  <input value={outType} onChange={(e) => setOutType(e.target.value)}
                    className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Payload</label>
                  <textarea value={outPayload} onChange={(e) => setOutPayload(e.target.value)} rows={6}
                    className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-200" />
                </div>

                <button onClick={sendMessage} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                  Send
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-2xl bg-white shadow-sm border p-5 h-full">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Logs</h2>
                <button onClick={() => setLogs([])} className="rounded-xl border bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
                  Clear
                </button>
              </div>

              <div className="mt-4 h-[560px] overflow-auto rounded-xl border bg-gray-900 p-3">
                {logs.length === 0 ? (
                  <div className="text-sm text-gray-300">No logs yet…</div>
                ) : (
                  <ul className="space-y-1">
                    {logs.map((l, idx) => (
                      <li key={idx} className="text-xs text-gray-200 font-mono">{l}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-3 text-xs text-gray-500">
                WS Base effective: <span className="font-mono">{normalizeWsBase(effectiveWsBase)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm border p-5">
          <div className="text-sm text-gray-700 font-semibold">Local Production URLs</div>
          <div className="mt-2 text-xs text-gray-600">
            Dashboard: <span className="font-mono">http://127.0.0.1:3000</span> <br />
            WS Hub Health: <span className="font-mono">http://127.0.0.1:8787/health</span>
          </div>
        </div>
      </div>
    </div>
  );
}
