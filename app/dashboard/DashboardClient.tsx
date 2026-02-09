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

// ====== Styles ======
const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8f9fa',
    padding: '24px',
  } as React.CSSProperties,
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  } as React.CSSProperties,
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e8e8e8',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  } as React.CSSProperties,
  cardTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: '4px',
  } as React.CSSProperties,
  cardSubtitle: {
    fontSize: '13px',
    color: '#888',
    marginBottom: '16px',
  } as React.CSSProperties,
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#555',
    display: 'block',
    marginBottom: '4px',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d9d9d9',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: "'Times New Roman', Times, serif",
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d9d9d9',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: 'monospace',
    outline: 'none',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  btnPrimary: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Times New Roman', Times, serif",
  } as React.CSSProperties,
  btnDanger: {
    background: '#ff4d4f',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Times New Roman', Times, serif",
  } as React.CSSProperties,
  btnSuccess: {
    background: '#52c41a',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Times New Roman', Times, serif",
  } as React.CSSProperties,
  btnOutline: {
    background: '#f5f5f5',
    color: '#333',
    border: '1px solid #d9d9d9',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Times New Roman', Times, serif",
  } as React.CSSProperties,
  statusBadge: (status: WsStatus) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 600,
    background: status === 'online' ? '#f6ffed' : status === 'connecting' ? '#e6f7ff' : status === 'error' ? '#fff2f0' : '#f5f5f5',
    color: status === 'online' ? '#52c41a' : status === 'connecting' ? '#1890ff' : status === 'error' ? '#ff4d4f' : '#888',
    border: `1px solid ${status === 'online' ? '#b7eb8f' : status === 'connecting' ? '#91d5ff' : status === 'error' ? '#ffccc7' : '#d9d9d9'}`,
  }) as React.CSSProperties,
  agentCard: (isOnline: boolean) => ({
    padding: '12px 16px',
    borderRadius: '8px',
    border: `1px solid ${isOnline ? '#b7eb8f' : '#e8e8e8'}`,
    background: isOnline ? '#f6ffed' : '#fafafa',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }) as React.CSSProperties,
  logBox: {
    background: '#1a1a2e',
    borderRadius: '8px',
    padding: '12px',
    height: '400px',
    overflowY: 'auto' as const,
    marginTop: '12px',
  } as React.CSSProperties,
  logLine: {
    fontSize: '12px',
    color: '#a0e4a0',
    fontFamily: 'monospace',
    marginBottom: '2px',
    wordBreak: 'break-all' as const,
  } as React.CSSProperties,
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  } as React.CSSProperties,
  grid3: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.5fr 1fr',
    gap: '16px',
    alignItems: 'end',
  } as React.CSSProperties,
  flexBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  } as React.CSSProperties,
  flexGap: {
    display: 'flex',
    gap: '8px',
  } as React.CSSProperties,
  sessionInfo: {
    background: '#f0f7ff',
    borderRadius: '8px',
    padding: '12px 16px',
    marginTop: '16px',
    fontSize: '13px',
    color: '#333',
    border: '1px solid #d6e4ff',
  } as React.CSSProperties,
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  } as React.CSSProperties,
  emptyState: {
    padding: '24px',
    textAlign: 'center' as const,
    color: '#999',
    fontSize: '14px',
    border: '2px dashed #e8e8e8',
    borderRadius: '8px',
  } as React.CSSProperties,
  hint: {
    fontSize: '12px',
    color: '#999',
    marginTop: '4px',
  } as React.CSSProperties,
};

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
    try { wsRef.current?.close(1000, reason); } catch {}
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
    try { wsRef.current?.close(1000, "reconnect"); } catch {}
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
      try { ws.send(JSON.stringify({ type: "ping", ts: Date.now() })); } catch {}
    };

    ws.onmessage = (ev) => {
      let msg: HubMsg | null = null;
      try { msg = JSON.parse(String(ev.data)); } catch { return; }
      if (!msg?.type) return;

      if (msg.type === "hub_welcome") {
        setWelcome(msg.payload || null);
        if (Array.isArray(msg.payload?.agents)) {
          msg.payload.agents.forEach((a: any) => setAgentOnline(a));
        }
        pushLog(`[in] hub_welcome — clientId=${msg.payload?.clientId}`);
      } else if (msg.type === "agent_online") {
        setAgentOnline(msg.payload);
        pushLog(`[in] agent_online — ${msg.payload?.clientId}`);
      } else if (msg.type === "agent_offline") {
        setAgentOffline(msg.payload);
        pushLog(`[in] agent_offline — ${msg.payload?.clientId}`);
      } else if (msg.type === "pong") {
        pushLog(`[in] pong`);
      } else {
        pushLog(`[in] ${msg.type}`);
      }
    };

    ws.onerror = () => {
      pushLog("[ws] error");
    };

    ws.onclose = (ev) => {
      setStatus("offline");
      markAllOffline();
      const reason = ev.reason || `code=${ev.code}`;
      pushLog(`[ws] closed (${reason})`);
      if (ev.code !== 1000) scheduleReconnect(reason);
    };
  }

  function sendMessage() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      pushLog("[out] not connected");
      return;
    }
    let payloadObj: any;
    try { payloadObj = JSON.parse(outPayload); } catch { payloadObj = outPayload; }
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

  useEffect(() => { try { localStorage.setItem("vrbot_dashboard_token", token); } catch {} }, [token]);
  useEffect(() => { try { localStorage.setItem("vrbot_ws_base", wsBase); } catch {} }, [wsBase]);
  useEffect(() => { return () => { clearReconnectTimer(); try { wsRef.current?.close(1000, "unmount"); } catch {} }; }, []);

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
    <div style={styles.page}>
      <div style={styles.container}>
        {/* ====== Connection Card ====== */}
        <div style={styles.card}>
          <div style={styles.flexBetween}>
            <div>
              <h1 style={styles.cardTitle}>🖥️ Dashboard</h1>
              <p style={styles.cardSubtitle}>Presence • Auto-Reconnect • Live Agents</p>
            </div>
            <div style={styles.statusBadge(status)}>
              {status === 'online' ? '🟢' : status === 'connecting' ? '🔵' : status === 'error' ? '🔴' : '⚪'}
              {' '}{status} — {statusMsg}
            </div>
          </div>

          <div style={styles.grid3}>
            <div>
              <label style={styles.label}>WS Base</label>
              <input
                value={wsBase}
                onChange={(e) => setWsBase(e.target.value)}
                placeholder={effectiveWsBase}
                style={styles.input}
              />
              <p style={styles.hint}>اتركه فارغاً لاستخدام NEXT_PUBLIC_WS_BASE أو local.</p>
            </div>
            <div>
              <label style={styles.label}>Token</label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                style={styles.input}
              />
            </div>
            <div>
              <div style={styles.checkboxRow}>
                <input type="checkbox" checked={autoReconnect} onChange={(e) => setAutoReconnect(e.target.checked)} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#555' }}>Auto-Reconnect</span>
              </div>
              <div style={styles.flexGap}>
                <button onClick={connect} style={styles.btnPrimary}>🔗 Connect</button>
                <button onClick={() => disconnect()} style={styles.btnDanger}>⛔ Disconnect</button>
              </div>
            </div>
          </div>

          {welcome && (
            <div style={styles.sessionInfo}>
              <strong>Session Info:</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <div><span style={{ color: '#888' }}>clientId:</span> {welcome.clientId}</div>
                <div><span style={{ color: '#888' }}>role:</span> {welcome.role}</div>
                <div><span style={{ color: '#888' }}>serverTs:</span> {fmtTime(welcome.serverTs)}</div>
              </div>
            </div>
          )}
        </div>

        {/* ====== Main Grid ====== */}
        <div style={styles.grid2}>
          {/* Left Column */}
          <div>
            {/* Agents */}
            <div style={styles.card}>
              <div style={styles.flexBetween}>
                <h2 style={styles.cardTitle}>👥 Agents</h2>
                <span style={{
                  background: '#f0f0f0',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#333',
                }}>
                  Online: {onlineCount} / {agentList.length}
                </span>
              </div>

              {agentList.length === 0 ? (
                <div style={styles.emptyState}>
                  لا يوجد Agents متصلين. شغّل خدمة VRBOT-AGENT.
                </div>
              ) : (
                agentList.map((a) => (
                  <div key={a.clientId} style={styles.agentCard(a.status === 'online')}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1a1a2e', marginBottom: '4px' }}>
                        {a.name || a.deviceId || a.clientId}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        deviceId: <span style={{ fontFamily: 'monospace' }}>{a.deviceId || "—"}</span>
                        {' '} • last seen: {msAgo(a.lastSeen)} ago
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: a.status === 'online' ? '#52c41a' : '#d9d9d9',
                      color: '#fff',
                    }}>
                      {a.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Send */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📤 Send</h2>
              <p style={styles.cardSubtitle}>رسائل عامة إلى agents عبر hub.</p>

              <div style={{ marginBottom: '12px' }}>
                <label style={styles.label}>Type</label>
                <input value={outType} onChange={(e) => setOutType(e.target.value)} style={styles.input} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={styles.label}>Payload</label>
                <textarea value={outPayload} onChange={(e) => setOutPayload(e.target.value)} rows={5} style={styles.textarea} />
              </div>

              <button onClick={sendMessage} style={styles.btnSuccess}>📤 Send Message</button>
            </div>
          </div>

          {/* Right Column - Logs */}
          <div>
            <div style={styles.card}>
              <div style={styles.flexBetween}>
                <h2 style={styles.cardTitle}>📋 Logs</h2>
                <button onClick={() => setLogs([])} style={styles.btnOutline}>🗑️ Clear</button>
              </div>

              <div style={styles.logBox}>
                {logs.length === 0 ? (
                  <div style={{ color: '#666', fontSize: '13px' }}>No logs yet…</div>
                ) : (
                  logs.map((l, idx) => (
                    <div key={idx} style={styles.logLine}>{l}</div>
                  ))
                )}
              </div>

              <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
                WS Base: <span style={{ fontFamily: 'monospace' }}>{normalizeWsBase(effectiveWsBase)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
