"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

type WsStatus = "idle" | "connecting" | "online" | "offline" | "error";
type Lang = "ar" | "en" | "ru" | "zh";

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

// ====== Translations ======
const tr: Record<Lang, Record<string, string>> = {
  ar: {
    title: '🖥️ لوحة التحكم',
    subtitle: 'الاتصال • إعادة الاتصال التلقائي • الوكلاء المباشرين',
    wsBase: 'عنوان WS',
    wsHint: 'يُملأ تلقائياً من إعدادات السيرفر.',
    token: 'رمز الدخول',
    tokenHint: 'يُؤخذ تلقائياً من جلسة تسجيل الدخول.',
    autoReconnect: 'إعادة اتصال تلقائي',
    connect: '🔗 اتصال',
    disconnect: '⛔ قطع',
    agents: '👥 الوكلاء',
    online: 'متصل',
    offline: 'غير متصل',
    noAgents: 'لا يوجد Agents متصلين. شغّل خدمة VRBOT-AGENT.',
    send: '📤 إرسال',
    sendHint: 'رسائل عامة إلى agents عبر hub.',
    sendBtn: '📤 إرسال رسالة',
    logs: '📋 السجلات',
    clear: '🗑️ مسح',
    noLogs: 'لا توجد سجلات بعد...',
    session: 'معلومات الجلسة',
    type: 'النوع',
    payload: 'البيانات',
    loadingToken: '⏳ جارٍ تحميل رمز الدخول...',
    noSession: '⚠️ يرجى تسجيل الدخول أولاً',
    user: 'المستخدم',
  },
  en: {
    title: '🖥️ Dashboard',
    subtitle: 'Presence • Auto-Reconnect • Live Agents',
    wsBase: 'WS Base',
    wsHint: 'Auto-filled from server settings.',
    token: 'Token',
    tokenHint: 'Auto-fetched from login session.',
    autoReconnect: 'Auto-Reconnect',
    connect: '🔗 Connect',
    disconnect: '⛔ Disconnect',
    agents: '👥 Agents',
    online: 'Online',
    offline: 'Offline',
    noAgents: 'No agents connected. Start VRBOT-AGENT service.',
    send: '📤 Send',
    sendHint: 'Send messages to agents via hub.',
    sendBtn: '📤 Send Message',
    logs: '📋 Logs',
    clear: '🗑️ Clear',
    noLogs: 'No logs yet...',
    session: 'Session Info',
    type: 'Type',
    payload: 'Payload',
    loadingToken: '⏳ Loading token...',
    noSession: '⚠️ Please login first',
    user: 'User',
  },
  ru: {
    title: '🖥️ Панель управления',
    subtitle: 'Подключение • Авто-переподключение • Агенты',
    wsBase: 'WS Адрес',
    wsHint: 'Заполняется автоматически.',
    token: 'Токен',
    tokenHint: 'Получен автоматически из сессии.',
    autoReconnect: 'Авто-переподключение',
    connect: '🔗 Подключить',
    disconnect: '⛔ Отключить',
    agents: '👥 Агенты',
    online: 'Онлайн',
    offline: 'Офлайн',
    noAgents: 'Нет подключенных агентов. Запустите VRBOT-AGENT.',
    send: '📤 Отправить',
    sendHint: 'Отправить сообщения агентам через hub.',
    sendBtn: '📤 Отправить сообщение',
    logs: '📋 Логи',
    clear: '🗑️ Очистить',
    noLogs: 'Логов пока нет...',
    session: 'Информация о сессии',
    type: 'Тип',
    payload: 'Данные',
    loadingToken: '⏳ Загрузка токена...',
    noSession: '⚠️ Войдите в систему',
    user: 'Пользователь',
  },
  zh: {
    title: '🖥️ 控制面板',
    subtitle: '连接 • 自动重连 • 实时代理',
    wsBase: 'WS 地址',
    wsHint: '从服务器设置自动填充。',
    token: '令牌',
    tokenHint: '从登录会话自动获取。',
    autoReconnect: '自动重连',
    connect: '🔗 连接',
    disconnect: '⛔ 断开',
    agents: '👥 代理',
    online: '在线',
    offline: '离线',
    noAgents: '没有连接的代理。启动 VRBOT-AGENT 服务。',
    send: '📤 发送',
    sendHint: '通过 hub 向代理发送消息。',
    sendBtn: '📤 发送消息',
    logs: '📋 日志',
    clear: '🗑️ 清除',
    noLogs: '暂无日志...',
    session: '会话信息',
    type: '类型',
    payload: '数据',
    loadingToken: '⏳ 正在加载令牌...',
    noSession: '⚠️ 请先登录',
    user: '用户',
  },
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

export default function DashboardClient() {
  const envWsUrl = (process.env.NEXT_PUBLIC_WS_URL || "").trim();
  const [wsBase, setWsBase] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [tokenLoading, setTokenLoading] = useState<boolean>(true);
  const [lang, setLang] = useState<Lang>("ar");

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

  const tx = tr[lang] || tr.ar;

  // ====== Auto-load Supabase session token ======
  useEffect(() => {
    async function loadSession() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          setToken(session.access_token);
          setUserEmail(session.user?.email || "");
        }
      } catch (err) {
        console.error("Failed to get Supabase session:", err);
      } finally {
        setTokenLoading(false);
      }
    }
    loadSession();
  }, []);

  // Load language
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vrbot_lang") as Lang;
      if (saved && tr[saved]) setLang(saved);
    } catch {}
  }, []);

  // Set WS Base from env
  useEffect(() => {
    if (envWsUrl) setWsBase(envWsUrl);
  }, [envWsUrl]);

  const effectiveWsBase = useMemo(() => {
    return wsBase.trim() || envWsUrl || "ws://127.0.0.1:8787/ws";
  }, [wsBase, envWsUrl]);

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
    reconnectTimerRef.current = setTimeout(() => doConnect(), delay);
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

  function doConnect() {
    if (!token.trim()) {
      setStatus("error");
      setStatusMsg("Token is required — please login");
      return;
    }
    clearReconnectTimer();
    const wsUrl = buildWsUrl(effectiveWsBase, { role: "dashboard", token: token.trim() });
    try { wsRef.current?.close(1000, "reconnect"); } catch {}
    setStatus("connecting");
    setStatusMsg("Connecting…");
    pushLog(`[ws] connecting...`);

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

    ws.onerror = () => { pushLog("[ws] error"); };

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
    <div dir="ltr" style={{ minHeight: '100vh', background: '#f8f9fa', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* ====== Connection Card ====== */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{tx.title}</h1>
              <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{tx.subtitle}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {userEmail && (
                <span style={{ fontSize: '13px', color: '#555', background: '#f0f7ff', padding: '6px 12px', borderRadius: '20px', border: '1px solid #d6e4ff' }}>
                  👤 {userEmail}
                </span>
              )}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
                background: status === 'online' ? '#f6ffed' : status === 'error' ? '#fff2f0' : '#f5f5f5',
                color: status === 'online' ? '#52c41a' : status === 'error' ? '#ff4d4f' : '#888',
                border: `1px solid ${status === 'online' ? '#b7eb8f' : status === 'error' ? '#ffccc7' : '#d9d9d9'}`,
              }}>
                {status === 'online' ? '🟢' : status === 'connecting' ? '🔵' : status === 'error' ? '🔴' : '⚪'}
                {' '}{status} {statusMsg && `— ${statusMsg}`}
              </div>
            </div>
          </div>

          {/* Token Status */}
          {tokenLoading ? (
            <div style={{ padding: '12px', background: '#fffbe6', borderRadius: '8px', border: '1px solid #ffe58f', fontSize: '14px', color: '#ad8b00', marginBottom: '16px' }}>
              {tx.loadingToken}
            </div>
          ) : !token ? (
            <div style={{ padding: '12px', background: '#fff2f0', borderRadius: '8px', border: '1px solid #ffccc7', fontSize: '14px', color: '#ff4d4f', marginBottom: '16px' }}>
              {tx.noSession} — <a href="/login" style={{ color: '#1890ff', textDecoration: 'underline' }}>Login</a>
            </div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>{tx.wsBase}</label>
              <input value={wsBase} onChange={(e) => setWsBase(e.target.value)} placeholder={effectiveWsBase} style={inputStyle} />
              <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{tx.wsHint}</p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <input type="checkbox" checked={autoReconnect} onChange={(e) => setAutoReconnect(e.target.checked)} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#555' }}>{tx.autoReconnect}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={doConnect} disabled={!token || tokenLoading} style={{ ...btnPrimary, opacity: (!token || tokenLoading) ? 0.5 : 1 }}>{tx.connect}</button>
                <button onClick={() => disconnect()} style={btnDanger}>{tx.disconnect}</button>
              </div>
            </div>
          </div>

          {welcome && (
            <div style={{ background: '#f0f7ff', borderRadius: '8px', padding: '12px 16px', marginTop: '16px', fontSize: '13px', border: '1px solid #d6e4ff' }}>
              <strong>{tx.session}:</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <div><span style={{ color: '#888' }}>clientId:</span> {welcome.clientId}</div>
                <div><span style={{ color: '#888' }}>role:</span> {welcome.role}</div>
                <div><span style={{ color: '#888' }}>serverTs:</span> {fmtTime(welcome.serverTs)}</div>
              </div>
            </div>
          )}
        </div>

        {/* ====== Main Grid ====== */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* LEFT: Agents + Send */}
          <div>
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{tx.agents}</h2>
                <span style={{ background: '#f0f0f0', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
                  {tx.online}: {onlineCount} / {agentList.length}
                </span>
              </div>

              {agentList.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#999', fontSize: '14px', border: '2px dashed #e8e8e8', borderRadius: '8px' }}>
                  {tx.noAgents}
                </div>
              ) : (
                agentList.map((a) => (
                  <div key={a.clientId} style={{
                    padding: '12px 16px', borderRadius: '8px', marginBottom: '8px',
                    border: `1px solid ${a.status === 'online' ? '#b7eb8f' : '#e8e8e8'}`,
                    background: a.status === 'online' ? '#f6ffed' : '#fafafa',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1a1a2e', marginBottom: '4px' }}>
                        {a.name || a.deviceId || a.clientId}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        deviceId: <span style={{ fontFamily: 'monospace' }}>{a.deviceId || "—"}</span>
                        {' '}• last seen: {msAgo(a.lastSeen)} ago
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                      background: a.status === 'online' ? '#52c41a' : '#d9d9d9', color: '#fff',
                    }}>
                      {a.status === 'online' ? tx.online : tx.offline}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div style={cardStyle}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px' }}>{tx.send}</h2>
              <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>{tx.sendHint}</p>

              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>{tx.type}</label>
                <input value={outType} onChange={(e) => setOutType(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>{tx.payload}</label>
                <textarea value={outPayload} onChange={(e) => setOutPayload(e.target.value)} rows={5} style={{
                  ...inputStyle, fontFamily: 'monospace', resize: 'vertical' as const,
                }} />
              </div>

              <button onClick={sendMessage} style={btnSuccess}>{tx.sendBtn}</button>
            </div>
          </div>

          {/* RIGHT: Logs */}
          <div>
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{tx.logs}</h2>
                <button onClick={() => setLogs([])} style={btnOutline}>{tx.clear}</button>
              </div>

              <div style={{
                background: '#1a1a2e', borderRadius: '8px', padding: '12px',
                height: '500px', overflowY: 'auto',
              }}>
                {logs.length === 0 ? (
                  <div style={{ color: '#666', fontSize: '13px' }}>{tx.noLogs}</div>
                ) : (
                  logs.map((l, idx) => (
                    <div key={idx} style={{ fontSize: '12px', color: '#a0e4a0', fontFamily: 'monospace', marginBottom: '2px', wordBreak: 'break-all' }}>{l}</div>
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

// ====== Shared Styles ======
const cardStyle: React.CSSProperties = {
  background: '#ffffff', borderRadius: '12px', border: '1px solid #e8e8e8',
  padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
};
const labelStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 600, color: '#555', display: 'block', marginBottom: '4px',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '8px',
  fontSize: '14px', outline: 'none', fontFamily: "'Times New Roman', Times, serif", boxSizing: 'border-box',
};
const btnPrimary: React.CSSProperties = {
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: '#fff', border: 'none',
  padding: '10px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
  fontFamily: "'Times New Roman', Times, serif",
};
const btnDanger: React.CSSProperties = {
  background: '#ff4d4f', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px',
  fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Times New Roman', Times, serif",
};
const btnSuccess: React.CSSProperties = {
  background: '#52c41a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px',
  fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Times New Roman', Times, serif",
};
const btnOutline: React.CSSProperties = {
  background: '#f5f5f5', color: '#333', border: '1px solid #d9d9d9', padding: '8px 16px',
  borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  fontFamily: "'Times New Roman', Times, serif",
};
