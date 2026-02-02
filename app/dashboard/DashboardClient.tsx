"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  email: string;
  plan: string;
  status: string;
  formattedPeriodEnd: string;
};

type TokenPayload = {
  role?: string;
  wsBase?: string;        // wss://.../ws
  wsBaseUrl?: string;     // alias
  baseUrl?: string;       // alias
};

const LS_TOKEN = "dashboard_token";
const LS_WSBASE = "dashboard_wsbase";
const LS_AUTOCONNECT = "dashboard_autoconnect";

type WsState = "offline" | "connecting" | "online";

function safeTrim(v?: string | null) {
  return (v ?? "").trim();
}

function nowTime() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function tryJsonParse<T>(txt: string): T | null {
  try {
    return JSON.parse(txt) as T;
  } catch {
    return null;
  }
}

function tryDecodeDashboardToken(raw: string): TokenPayload | null {
  const t = safeTrim(raw);
  if (!t) return null;

  // direct JSON?
  const direct = tryJsonParse<TokenPayload>(t);
  if (direct && typeof direct === "object") return direct;

  // base64 or base64url JSON
  const normalized = t.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  try {
    const decoded = atob(padded);
    const asJson = tryJsonParse<TokenPayload>(decoded);
    if (asJson && typeof asJson === "object") return asJson;
  } catch {
    // ignore
  }

  return null;
}

function getWsBaseFromEnvOrLocation(): string {
  // env first
  const env = safeTrim(process.env.NEXT_PUBLIC_WS_BASE);
  if (env) return env;

  // codespaces/local fallback: same host but ws on :8787
  const { protocol, hostname } = window.location;
  const wsProto = protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${hostname}:8787/ws`;
}

function normalizeWsBase(base: string) {
  let b = safeTrim(base);

  // allow user to paste host only
  if (b && !/^wss?:\/\//i.test(b)) {
    b = `wss://${b}`;
  }

  // ensure ends with /ws
  try {
    const u = new URL(b);
    if (!u.pathname || u.pathname === "/") u.pathname = "/ws";
    if (!u.pathname.endsWith("/ws")) {
      // if ends with /ws/ etc.
      u.pathname = u.pathname.replace(/\/+$/, "");
      if (!u.pathname.endsWith("/ws")) u.pathname = `${u.pathname}/ws`.replace(/\/{2,}/g, "/");
    }
    return u.toString();
  } catch {
    return b;
  }
}

function buildWsUrl(wsBase: string, token: string) {
  const base = normalizeWsBase(wsBase);
  const tok = safeTrim(token);

  const u = new URL(base);
  u.searchParams.set("role", "dashboard");
  if (tok) u.searchParams.set("token", tok);
  return u.toString();
}

// Exponential backoff with cap + jitter
function computeBackoffMs(attempt: number) {
  const base = 800;                // start
  const cap = 15000;               // max
  const exp = Math.min(cap, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * 350); // small random
  return exp + jitter;
}

export default function DashboardClient({
  email,
  plan,
  status,
  formattedPeriodEnd,
}: Props) {
  // UI state
  const [tokenInput, setTokenInput] = useState("");
  const [wsBaseOverride, setWsBaseOverride] = useState("");
  const [autoConnect, setAutoConnect] = useState(true);

  const [wsState, setWsState] = useState<WsState>("offline");
  const [wsError, setWsError] = useState<string>("");
  const [wsUrl, setWsUrl] = useState<string>("");
  const [lastEvent, setLastEvent] = useState<string>("");

  const [devicesCount, setDevicesCount] = useState<number>(0);
  const [streamStatus, setStreamStatus] = useState<string>("No stream status yet.");

  // Refs for WS lifecycle
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const manualCloseRef = useRef<boolean>(false);
  const lastPongRef = useRef<number>(0);

  // logs (lightweight)
  const [logs, setLogs] = useState<string[]>([]);
  const pushLog = (msg: string) => {
    setLogs((prev) => {
      const next = [`[${nowTime()}] ${msg}`, ...prev];
      return next.slice(0, 60); // keep 60
    });
  };

  // Badges
  const planStyles: Record<string, { bg: string; color: string; label: string; icon: string }> = {
    trial: { bg: "#e0f2fe", color: "#075985", label: "TRIAL", icon: "⏳" },
    free: { bg: "#e5e7eb", color: "#374151", label: "FREE", icon: "•" },
    pro: { bg: "#dcfce7", color: "#166534", label: "PRO", icon: "⚡" },
    enterprise: { bg: "#ede9fe", color: "#5b21b6", label: "ENTERPRISE", icon: "◆" },
  };
  const statusStyles: Record<string, { bg: string; color: string; label: string; icon: string }> = {
    active: { bg: "#dcfce7", color: "#166534", label: "ACTIVE", icon: "✓" },
    trialing: { bg: "#e0f2fe", color: "#075985", label: "TRIALING", icon: "⏳" },
    expired: { bg: "#fee2e2", color: "#991b1b", label: "EXPIRED", icon: "✕" },
    canceled: { bg: "#fee2e2", color: "#991b1b", label: "CANCELED", icon: "✕" },
    past_due: { bg: "#fef3c7", color: "#92400e", label: "PAST DUE", icon: "!" },
    "-": { bg: "#e5e7eb", color: "#374151", label: "NONE", icon: "•" },
  };
  const planBadge = planStyles[plan] ?? {
    bg: "#e5e7eb",
    color: "#374151",
    label: String(plan).toUpperCase(),
    icon: "•",
  };
  const statusBadge = statusStyles[status] ?? {
    bg: "#e5e7eb",
    color: "#374151",
    label: String(status).toUpperCase(),
    icon: "•",
  };

  // Styles
  const badgeStyleBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1,
    whiteSpace: "nowrap",
    border: "1px solid rgba(0,0,0,0.06)",
  };

  const cardStyle: React.CSSProperties = {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    background: "#fff",
    boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 0",
    borderTop: "1px solid #f1f5f9",
    flexWrap: "wrap",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    letterSpacing: 0.6,
    fontWeight: 900,
    color: "#334155",
    textTransform: "uppercase",
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    wordBreak: "break-word",
  };

  // Load saved settings
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(LS_TOKEN) ?? "";
      const savedBase = localStorage.getItem(LS_WSBASE) ?? "";
      const savedAuto = localStorage.getItem(LS_AUTOCONNECT);
      if (savedToken) setTokenInput(savedToken);
      if (savedBase) setWsBaseOverride(savedBase);
      if (savedAuto !== null) setAutoConnect(savedAuto === "1");
    } catch {}
  }, []);

  // Effective WS base
  const effectiveWsBase = useMemo(() => {
    const manual = safeTrim(wsBaseOverride);
    if (manual) return normalizeWsBase(manual);
    return normalizeWsBase(getWsBaseFromEnvOrLocation());
  }, [wsBaseOverride]);

  // --- WS lifecycle helpers ---
  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const clearHeartbeatTimer = () => {
    if (heartbeatTimerRef.current) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  };

  const closeWs = (reason: string) => {
    clearReconnectTimer();
    clearHeartbeatTimer();

    const ws = wsRef.current;
    wsRef.current = null;

    if (ws) {
      try {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
      } catch {}
    }

    setWsState("offline");
    pushLog(`WS closed: ${reason}`);
  };

  const scheduleReconnect = (why: string) => {
    if (!autoConnect) return;
    if (manualCloseRef.current) return;

    clearReconnectTimer();
    const attempt = reconnectAttemptRef.current;
    const delay = computeBackoffMs(attempt);

    pushLog(`Reconnecting in ${Math.round(delay)}ms (${why})`);
    setLastEvent(`Reconnect scheduled (${Math.round(delay)}ms)`);

    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectAttemptRef.current += 1;
      connectInternal("auto-reconnect");
    }, delay);
  };

  const handleIncomingMessage = (raw: string) => {
    // Many backends send JSON events. We support:
    // {type:"pong"} / {type:"devices",count:..} / {type:"stream",status:"..."} / other
    const obj = tryJsonParse<any>(raw);

    if (obj && typeof obj === "object") {
      const type = String(obj.type ?? obj.event ?? "").toLowerCase();

      if (type === "pong") {
        lastPongRef.current = Date.now();
        setLastEvent("PONG");
        return;
      }

      if (type === "devices" && typeof obj.count === "number") {
        setDevicesCount(obj.count);
        setLastEvent(`Devices: ${obj.count}`);
        return;
      }

      if (type === "stream" && typeof obj.status === "string") {
        setStreamStatus(obj.status);
        setLastEvent(`Stream: ${obj.status}`);
        return;
      }
    }

    // fallback: show minimal
    setLastEvent("Message received");
  };

  const startHeartbeat = () => {
    clearHeartbeatTimer();
    lastPongRef.current = Date.now();

    // Every 10s ping. If no pong for 30s -> reconnect
    heartbeatTimerRef.current = window.setInterval(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      // send ping
      try {
        ws.send(JSON.stringify({ type: "ping", t: Date.now() }));
        pushLog("PING");
      } catch {}

      // check stale
      const sincePong = Date.now() - lastPongRef.current;
      if (sincePong > 30000) {
        pushLog("Heartbeat stale (>30s). Forcing reconnect.");
        setWsError("Heartbeat timeout. Reconnecting…");
        closeWs("heartbeat timeout");
        scheduleReconnect("heartbeat-timeout");
      }
    }, 10000);
  };

  const connectInternal = (mode: "manual" | "auto-reconnect") => {
    setWsError("");
    setLastEvent("");
    setWsState("connecting");

    manualCloseRef.current = false;

    const token = safeTrim(tokenInput);

    // token can include wsBase
    const decoded = tryDecodeDashboardToken(token);
    const tokenWsBase =
      safeTrim(decoded?.wsBase) || safeTrim(decoded?.wsBaseUrl) || safeTrim(decoded?.baseUrl);

    const finalWsBase = tokenWsBase ? normalizeWsBase(tokenWsBase) : effectiveWsBase;
    const url = buildWsUrl(finalWsBase, token);

    setWsUrl(url);
    pushLog(`${mode === "manual" ? "Manual connect" : "Auto connect"} -> ${finalWsBase}`);

    // Close existing first
    if (wsRef.current) closeWs("reconnecting");

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (e: any) {
      setWsState("offline");
      setWsError(e?.message || "Failed to create WebSocket");
      pushLog(`WS create error: ${e?.message || "unknown"}`);
      scheduleReconnect("create-failed");
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setWsState("online");
      setWsError("");
      setLastEvent("Connected");
      pushLog("WS OPEN ✓");

      // save settings
      try {
        localStorage.setItem(LS_TOKEN, token);
        localStorage.setItem(LS_WSBASE, safeTrim(wsBaseOverride));
        localStorage.setItem(LS_AUTOCONNECT, autoConnect ? "1" : "0");
      } catch {}

      // start heartbeat
      startHeartbeat();

      // optional: ask for initial info
      try {
        ws.send(JSON.stringify({ type: "hello", role: "dashboard" }));
      } catch {}
    };

    ws.onmessage = (ev) => {
      const data = typeof ev.data === "string" ? ev.data : "";
      if (!data) return;

      // update pong if server echoes "pong" raw
      if (data === "pong") {
        lastPongRef.current = Date.now();
        setLastEvent("PONG");
        pushLog("PONG");
        return;
      }

      handleIncomingMessage(data);
    };

    ws.onerror = () => {
      setWsState("offline");
      setWsError("WebSocket error (check WS server / token / port visibility).");
      pushLog("WS ERROR");
      try {
        ws.close();
      } catch {}
    };

    ws.onclose = (e) => {
      setWsState("offline");
      clearHeartbeatTimer();
      const code = e?.code ?? 0;
      const reason = e?.reason ? ` - ${e.reason}` : "";
      pushLog(`WS CLOSE (code ${code})${reason}`);

      if (!manualCloseRef.current) {
        scheduleReconnect(`close-${code}`);
      }
    };
  };

  // Public actions
  const onApply = () => {
    reconnectAttemptRef.current = 0;
    connectInternal("manual");
  };

  const onDisconnect = () => {
    manualCloseRef.current = true;
    closeWs("manual disconnect");
  };

  const onClear = () => {
    manualCloseRef.current = true;
    closeWs("clear");
    setTokenInput("");
    setWsBaseOverride("");
    setWsUrl("");
    setWsError("");
    setLastEvent("");
    setDevicesCount(0);
    setStreamStatus("No stream status yet.");
    try {
      localStorage.removeItem(LS_TOKEN);
      localStorage.removeItem(LS_WSBASE);
      localStorage.removeItem(LS_AUTOCONNECT);
    } catch {}
  };

  // Auto connect on load (if enabled and token exists)
  useEffect(() => {
    if (!autoConnect) return;
    if (!safeTrim(tokenInput)) return;

    // Wait a tick (UI stable)
    const t = window.setTimeout(() => connectInternal("auto-reconnect"), 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  // Persist autoConnect toggle
  useEffect(() => {
    try {
      localStorage.setItem(LS_AUTOCONNECT, autoConnect ? "1" : "0");
    } catch {}
  }, [autoConnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      manualCloseRef.current = true;
      closeWs("unmount");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wsBadge =
    wsState === "online" ? (
      <span style={{ color: "#166534" }}>Online ✓</span>
    ) : wsState === "connecting" ? (
      <span style={{ color: "#92400e" }}>Connecting…</span>
    ) : (
      <span style={{ color: "#991b1b" }}>Offline ✕</span>
    );

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>Viking Rais | Dashboard</h1>
      <p style={{ marginTop: 6, color: "#475569", fontWeight: 600 }}>
        WebSocket Dashboard (Auto-Reconnect + Heartbeat)
      </p>

      {/* Subscription */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>Subscription</div>
            <div style={{ marginTop: 4, color: "#64748b", fontWeight: 600, fontSize: 13 }}>
              Your plan and current billing state
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={{ ...badgeStyleBase, backgroundColor: planBadge.bg, color: planBadge.color }}>
              <span aria-hidden="true">{planBadge.icon}</span>
              {planBadge.label}
            </span>
            <span style={{ ...badgeStyleBase, backgroundColor: statusBadge.bg, color: statusBadge.color }}>
              <span aria-hidden="true">{statusBadge.icon}</span>
              {statusBadge.label}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={rowStyle}>
            <div style={labelStyle}>PERIOD END</div>
            <div style={valueStyle}>{formattedPeriodEnd}</div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>EMAIL</div>
            <div style={valueStyle}>{email}</div>
          </div>
        </div>
      </div>

      {/* WS Setup */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>Connection</div>
        <div style={{ marginTop: 6, color: "#64748b", fontWeight: 600, fontSize: 13 }}>
          الصق التوكن ثم Apply. يوجد Auto-Connect و Auto-Reconnect + Heartbeat تلقائيًا.
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste dashboard token (or base64 JSON token)…"
            style={{
              flex: "1 1 650px",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              outline: "none",
              fontWeight: 700,
            }}
          />
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={wsBaseOverride}
            onChange={(e) => setWsBaseOverride(e.target.value)}
            placeholder="(Optional) Override WS Base e.g. wss://.../ws"
            style={{
              flex: "1 1 520px",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              outline: "none",
              fontWeight: 700,
            }}
          />

          <button
            onClick={onApply}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #0f172a",
              background: "#0f172a",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Apply
          </button>

          <button
            onClick={onDisconnect}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#0f172a",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Disconnect
          </button>

          <button
            onClick={onClear}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#f8fafc",
              color: "#0f172a",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Clear
          </button>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900, color: "#0f172a" }}>
            <input
              type="checkbox"
              checked={autoConnect}
              onChange={(e) => setAutoConnect(e.target.checked)}
            />
            Auto-Connect
          </label>
        </div>

        <div style={{ marginTop: 12, color: "#0f172a", fontWeight: 900 }}>
          WS: {wsBadge}
        </div>

        <div style={{ marginTop: 8, color: "#475569", fontWeight: 700, fontSize: 13 }}>
          Effective WS Base:{" "}
          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
            {effectiveWsBase}
          </span>
        </div>

        {wsUrl ? (
          <div style={{ marginTop: 8, color: "#475569", fontWeight: 700, fontSize: 13 }}>
            WS URL:{" "}
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              {wsUrl}
            </span>
          </div>
        ) : null}

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px", padding: 12, borderRadius: 12, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Devices</div>
            <div style={{ marginTop: 6, fontWeight: 900, fontSize: 22, color: "#0f172a" }}>{devicesCount}</div>
            <div style={{ marginTop: 4, color: "#64748b", fontWeight: 700, fontSize: 12 }}>
              Refresh happens via WS events
            </div>
          </div>

          <div style={{ flex: "2 1 520px", padding: 12, borderRadius: 12, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Streaming</div>
            <div style={{ marginTop: 6, fontWeight: 800, color: "#0f172a" }}>{streamStatus}</div>
            <div style={{ marginTop: 4, color: "#64748b", fontWeight: 700, fontSize: 12 }}>
              Last event: {lastEvent || "-"}
            </div>
          </div>
        </div>

        {wsError ? (
          <div style={{ marginTop: 12, color: "#991b1b", fontWeight: 900 }}>
            {wsError}
            <div style={{ marginTop: 6, color: "#64748b", fontWeight: 700, fontSize: 12 }}>
              تأكد أن Port 8787 = Public داخل Codespaces، وأن ws-server يعمل.
            </div>
          </div>
        ) : null}
      </div>

      {/* Logs */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>Logs</div>
            <div style={{ marginTop: 4, color: "#64748b", fontWeight: 700, fontSize: 12 }}>
              Lightweight connection logs (auto-reconnect, ping/pong)
            </div>
          </div>
          <button
            onClick={() => setLogs([])}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#0f172a",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Clear Logs
          </button>
        </div>

        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "#0b1020",
            color: "#e5e7eb",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
            lineHeight: 1.5,
            maxHeight: 260,
            overflow: "auto",
            whiteSpace: "pre-wrap",
          }}
        >
          {logs.length ? logs.join("\n") : "No logs yet."}
        </div>
      </div>
    </div>
  );
}
