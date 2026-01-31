"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAgentWs } from "./useAgentWs";

type Farm = { id: string; name: string; status: string; windowId?: string | null };
type Win = { windowId: string; title: string; pid?: number };

type StreamStatus = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

type UpdateInfo = {
  progress?: Record<string, unknown>;
  done?: Record<string, unknown>;
  error?: string;
};

type AgentSummary = {
  deviceId: string;
  orgId: string;
  hostname?: string | null;
  platform?: string | null;
  version?: string | null;
  lastSeen?: number | null;
  farms?: unknown;
  windows?: unknown;
  tools?: unknown;
};

type WsMsg = {
  type: string;
  payload?: unknown;
  id?: string;
  ts?: number;
};

const LS_TOKEN_KEY = "vrbot_dashboard_token";
const LS_DEVICE_KEY = "vrbot_selected_device";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asArray(v: unknown): unknown[] | null {
  return Array.isArray(v) ? v : null;
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

/**
 * Hub forwarded messages shape:
 *  { type: "...", payload: { deviceId: "...", payload: {...agentPayload} } }
 */
function unwrapForwarded(msg: WsMsg): { deviceId: string | null; innerPayload: unknown } {
  if (!isRecord(msg.payload)) return { deviceId: null, innerPayload: msg.payload };
  const deviceId = asString(msg.payload["deviceId"]);
  const inner = (msg.payload as Record<string, unknown>)["payload"];
  return { deviceId: deviceId ?? null, innerPayload: inner };
}

function normalizeWsBase(base: string): string {
  const b = base.trim();
  if (!b) return "ws://127.0.0.1:8787/ws";
  return b;
}

function buildWsUrl(base: string, token: string): string {
  const b = normalizeWsBase(base);
  // لو ما في توكن: نخليه بدون token= عشان ما يربك السيرفر
  if (!token || token.trim().length === 0) return `${b}?role=dashboard`;
  return `${b}?role=dashboard&token=${encodeURIComponent(token.trim())}`;
}

export default function DashboardPage() {
  const wsBase = useMemo(() => {
    // مثال: ws://127.0.0.1:8787/ws
    // أو wss://xxxx.app.github.dev/ws
    const envBase = process.env.NEXT_PUBLIC_WS_BASE;
    return envBase && envBase.trim().length > 0 ? envBase.trim() : "ws://127.0.0.1:8787/ws";
  }, []);

  // Token UI (Paste + localStorage)
  const [tokenInput, setTokenInput] = useState<string>("");
  const [token, setToken] = useState<string>("");

  // Selected device
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  // Hub state
  const [agents, setAgents] = useState<AgentSummary[]>([]);

  // Per selected device
  const [farms, setFarms] = useState<Farm[]>([]);
  const [windows, setWindows] = useState<Win[]>([]);
  const [stream, setStream] = useState<StreamStatus | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({});

  // Load token & selected device from storage
  useEffect(() => {
    try {
      const t = window.localStorage.getItem(LS_TOKEN_KEY) || "";
      const d = window.localStorage.getItem(LS_DEVICE_KEY) || "";
      setTokenInput(t);
      setToken(t);
      setSelectedDeviceId(d);
    } catch {
      // ignore
    }
  }, []);

  const wsUrl = useMemo(() => buildWsUrl(wsBase, token), [wsBase, token]);

  // ✅ واحد فقط (بدون تكرار)
  const { connected, lastMsg, send } = useAgentWs(wsUrl);

  // Helper: send to a specific device (hub expects payload.deviceId)
  const sendToDevice = (type: string, payload: Record<string, unknown> = {}) => {
    if (!selectedDeviceId) return false;
    return send(type, { deviceId: selectedDeviceId, ...payload });
  };

  // On connect: ask hub status (list agents)
  useEffect(() => {
    if (!connected) return;
    send("hub_status");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // Auto refresh device data when device changes & connected
  useEffect(() => {
    if (!connected || !selectedDeviceId) return;
    sendToDevice("get_status");
    sendToDevice("get_stream_status");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, selectedDeviceId]);

  // Persist selected device
  useEffect(() => {
    try {
      window.localStorage.setItem(LS_DEVICE_KEY, selectedDeviceId || "");
    } catch {}
  }, [selectedDeviceId]);

  // Handle WS messages
  useEffect(() => {
    if (!lastMsg) return;
    const msg = lastMsg as WsMsg;

    // 1) Hub status (agents list)
    if (msg.type === "hub_status") {
      if (!isRecord(msg.payload)) return;
      const agentsRaw = (msg.payload as Record<string, unknown>)["agents"];
      const arr = asArray(agentsRaw);
      if (!arr) return;

      const parsed: AgentSummary[] = arr
        .map((x) => (isRecord(x) ? x : null))
        .filter((x): x is Record<string, unknown> => !!x)
        .map((a) => {
          const deviceId = asString(a["deviceId"]) || "";
          const orgId = asString(a["orgId"]) || "";
          return {
            deviceId,
            orgId,
            hostname: asString(a["hostname"]),
            platform: asString(a["platform"]),
            version: asString(a["version"]),
            lastSeen: asNumber(a["lastSeen"]),
            farms: a["farms"],
            windows: a["windows"],
            tools: a["tools"],
          };
        })
        .filter((a) => a.deviceId.length > 0 && a.orgId.length > 0);

      setAgents(parsed);

      // Auto-select first agent if none selected
      if (!selectedDeviceId && parsed.length > 0) {
        setSelectedDeviceId(parsed[0].deviceId);
      }
      return;
    }

    // 2) Forwarded agent messages: unwrap {deviceId, payload}
    const { deviceId, innerPayload } = unwrapForwarded(msg);

    // Only update UI for currently selected device
    const isForSelected = !!deviceId && deviceId === selectedDeviceId;
    if (!isForSelected) return;

    // === agent_status / agent_hello (farms list)
    if (msg.type === "agent_hello" || msg.type === "agent_status") {
      if (!isRecord(innerPayload)) return;
      const farmsRaw = (innerPayload as Record<string, unknown>)["farms"];
      const arr = asArray(farmsRaw);
      if (arr) setFarms(arr as unknown as Farm[]);
      return;
    }

    // === farm_status (single update)
    if (msg.type === "farm_status") {
      if (!isRecord(innerPayload)) return;
      const id = asString((innerPayload as Record<string, unknown>)["id"]);
      if (!id) return;

      const f = innerPayload as unknown as Farm;
      setFarms((prev) => {
        const idx = prev.findIndex((x) => x.id === f.id);
        if (idx === -1) return [f, ...prev];
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...f };
        return copy;
      });
      return;
    }

    // === windows_list
    if (msg.type === "windows_list") {
      if (!isRecord(innerPayload)) return;
      const wRaw = (innerPayload as Record<string, unknown>)["windows"];
      const arr = asArray(wRaw);
      if (arr) setWindows(arr as unknown as Win[]);
      return;
    }

    // === stream_status
    if (msg.type === "stream_status") {
      if (!isRecord(innerPayload)) return;
      const ok = Boolean((innerPayload as Record<string, unknown>)["ok"]);
      const status = asNumber((innerPayload as Record<string, unknown>)["status"]) ?? 0;

      setStream({
        ok,
        status,
        data: (innerPayload as Record<string, unknown>)["data"],
        error: asString((innerPayload as Record<string, unknown>)["error"]) || undefined,
      });
      return;
    }

    // === auto update
    if (msg.type === "update_progress") {
      const p = isRecord(innerPayload) ? (innerPayload as Record<string, unknown>) : null;
      setUpdateInfo((prev) => ({ ...(prev || {}), progress: p ?? undefined }));
      return;
    }

    if (msg.type === "update_done") {
      const p = isRecord(innerPayload) ? (innerPayload as Record<string, unknown>) : null;
      setUpdateInfo((prev) => ({ ...(prev || {}), done: p ?? undefined, error: undefined }));
      return;
    }

    if (msg.type === "update_error") {
      const message =
        isRecord(innerPayload) && typeof innerPayload["message"] === "string"
          ? (innerPayload["message"] as string)
          : "Update error";
      setUpdateInfo((prev) => ({ ...(prev || {}), error: message }));
      return;
    }
  }, [lastMsg, selectedDeviceId]);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.deviceId === selectedDeviceId) || null,
    [agents, selectedDeviceId]
  );

  const applyToken = () => {
    const t = tokenInput.trim();
    setToken(t);
    try {
      window.localStorage.setItem(LS_TOKEN_KEY, t);
    } catch {}
  };

  const clearToken = () => {
    setTokenInput("");
    setToken("");
    try {
      window.localStorage.removeItem(LS_TOKEN_KEY);
    } catch {}
  };

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Viking Rais | Dashboard</h1>

      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        {/* Token Bar */}
        <div style={card}>
          <div style={{ fontWeight: 800 }}>Dashboard Token</div>
          <div style={{ opacity: 0.8, marginTop: 6, fontSize: 13 }}>
            الصق توكن العميل (Dashboard Token) ثم اضغط Apply. سيتم حفظه محليًا.
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <input
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste dashboard token هنا"
              style={input}
            />
            <button onClick={applyToken} style={btn}>
              Apply
            </button>
            <button onClick={clearToken} style={btn}>
              Clear
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            WS: <b>{connected ? "Online ✅" : "Offline ❌"}</b>
            <div style={{ opacity: 0.75, marginTop: 6, fontSize: 12 }}>{wsUrl}</div>
            <div style={{ opacity: 0.75, marginTop: 6, fontSize: 12 }}>
              WS Base: {wsBase}
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => send("hub_status")} style={btn}>
              Refresh Devices
            </button>
          </div>
        </div>

        {/* Devices */}
        <div style={card}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontWeight: 800 }}>Devices</div>
            <div style={{ opacity: 0.75, fontSize: 13 }}>({agents.length})</div>
          </div>

          {agents.length === 0 ? (
            <div style={{ opacity: 0.7, marginTop: 10 }}>
              لا توجد أجهزة. تأكد أن التوكن صحيح، ثم اضغط Refresh Devices.
            </div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <select value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)} style={select}>
                {agents.map((a) => {
                  const label = `${a.hostname || "Device"} • ${a.deviceId.slice(0, 8)} • org:${a.orgId}`;
                  return (
                    <option key={a.deviceId} value={a.deviceId}>
                      {label}
                    </option>
                  );
                })}
              </select>

              {selectedAgent && (
                <div style={{ opacity: 0.85, fontSize: 13 }}>
                  <div>
                    <b>Selected:</b> {selectedAgent.hostname || "-"} | <b>deviceId:</b>{" "}
                    {selectedAgent.deviceId} | <b>version:</b> {selectedAgent.version || "-"}
                  </div>
                </div>
              )}
              // في قسم الأزرار، أضف:
<a
  href="/bot"
  style={{
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid #0f172a',
    background: '#0f172a',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 800,
  }}
>
  🎮 فتح نظام Viking Rise Bot
</a>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                <button onClick={() => sendToDevice("get_status")} style={btn} disabled={!selectedDeviceId}>
                  Get Status
                </button>
                <button onClick={() => sendToDevice("discover_windows")} style={btn} disabled={!selectedDeviceId}>
                  Discover Windows
                </button>
                <button onClick={() => sendToDevice("get_stream_status")} style={btn} disabled={!selectedDeviceId}>
                  Stream Status
                </button>
                <button onClick={() => sendToDevice("update_start")} style={btn} disabled={!selectedDeviceId}>
                  Auto Update
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Streaming */}
        <div style={card}>
          <div style={{ fontWeight: 800 }}>Streaming</div>
          {!stream ? (
            <div style={{ opacity: 0.7, marginTop: 10 }}>No stream status yet. اضغط Stream Status.</div>
          ) : (
            <>
              <div style={{ marginTop: 10 }}>
                <b>Status:</b>{" "}
                {stream.ok ? (
                  <span style={{ color: "green" }}>OK ({stream.status})</span>
                ) : (
                  <span style={{ color: "crimson" }}>
                    Error ({stream.status || 0}) {stream.error ? `- ${stream.error}` : ""}
                  </span>
                )}
              </div>
              <pre style={pre}>{safeJson(stream)}</pre>
            </>
          )}
        </div>

        {/* Auto Update */}
        <div style={card}>
          <div style={{ fontWeight: 800 }}>Auto Update</div>
          <div style={{ opacity: 0.8, marginTop: 6, fontSize: 13 }}>
            اضغط <b>Auto Update</b> لتشغيل التحديث على الجهاز المحدد. (يعتمد على GitHub Releases داخل الـ Agent)
          </div>

          {updateInfo?.error && (
            <div style={{ marginTop: 10, color: "crimson", fontWeight: 700 }}>{updateInfo.error}</div>
          )}

          {updateInfo?.progress && (
            <>
              <div style={{ marginTop: 10, fontWeight: 700 }}>Progress</div>
              <pre style={pre}>{safeJson(updateInfo.progress)}</pre>
            </>
          )}

          {updateInfo?.done && (
            <>
              <div style={{ marginTop: 10, fontWeight: 700 }}>Done</div>
              <pre style={pre}>{safeJson(updateInfo.done)}</pre>
            </>
          )}
        </div>

        {/* Windows */}
        <div style={card}>
          <div style={{ fontWeight: 800 }}>Windows</div>
          {windows.length === 0 ? (
            <div style={{ opacity: 0.7, marginTop: 10 }}>No windows yet. اضغط Discover Windows.</div>
          ) : (
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {windows.map((w) => (
                <div key={w.windowId} style={miniCard}>
                  <div>
                    <b>{w.title}</b>
                  </div>
                  <div style={{ opacity: 0.8 }}>windowId: {w.windowId}</div>
                  {typeof w.pid === "number" && <div style={{ opacity: 0.8 }}>pid: {w.pid}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Farms */}
        <div style={card}>
          <div style={{ fontWeight: 800 }}>Farms</div>
          {farms.length === 0 ? (
            <div style={{ opacity: 0.7, marginTop: 10 }}>No farms configured yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {farms.map((f) => (
                <div key={f.id} style={miniCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div>
                        <b>{f.name}</b>
                      </div>
                      <div style={{ opacity: 0.8 }}>
                        id: {f.id} | status: {f.status} | window: {f.windowId ?? "-"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => sendToDevice("farm_start", { farmId: f.id })} style={btn} disabled={!selectedDeviceId}>
                        Start
                      </button>
                      <button onClick={() => sendToDevice("farm_stop", { farmId: f.id })} style={btn} disabled={!selectedDeviceId}>
                        Stop
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14, opacity: 0.7, fontSize: 12 }}>
        ملاحظة: الداشبورد يستقبل رسائل عدة أجهزة، لكن يعرض فقط الجهاز المحدد لتفادي تشويش البيانات.
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
};

const input: React.CSSProperties = {
  minWidth: 280,
  flex: 1,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ccc",
  outline: "none",
};

const select: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ccc",
  outline: "none",
  width: "100%",
  background: "#fff",
};

const card: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #e5e5e5",
  background: "#fff",
};

const miniCard: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #eee",
  background: "#fafafa",
};

const pre: React.CSSProperties = {
  marginTop: 10,
  whiteSpace: "pre-wrap",
  background: "#f7f7f7",
  border: "1px solid #eee",
  borderRadius: 10,
  padding: 10,
  fontSize: 12,
  lineHeight: 1.4,
};
