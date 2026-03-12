"use client";
import { useState, useEffect, useCallback } from "react";

/* ────────────────────────────────────────────────
   Agent Config Panel — manage agent settings & tokens
   Bilingual (ar / en), dark theme, inline CSS
   ──────────────────────────────────────────────── */

type Agent = {
  id: string;
  agent_id: string;
  device_id: string | null;
  status: string;
  bot_state: string;
  current_task: string;
  cycle: number;
  total_ok: number;
  total_fail: number;
  total_skip: number;
  uptime_seconds: number;
  game_restarts: number;
  captchas_detected: number;
  last_error: string;
  ip_address: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  last_heartbeat: string | null;
  last_seen: string;
  config: Record<string, any>;
};

type AgentToken = {
  id: string;
  token: string;
  label: string;
  is_active: boolean;
  last_used: string | null;
  created_at: string;
  expires_at: string | null;
};

const t: Record<string, Record<string, string>> = {
  title: { ar: "إدارة الوكلاء", en: "Agent Management" },
  agents: { ar: "الوكلاء المتصلين", en: "Connected Agents" },
  tokens: { ar: "رموز التوثيق", en: "Auth Tokens" },
  noAgents: { ar: "لا يوجد وكلاء مسجلين بعد", en: "No agents registered yet" },
  status: { ar: "الحالة", en: "Status" },
  device: { ar: "الجهاز", en: "Device" },
  ip: { ar: "عنوان IP", en: "IP Address" },
  lastSeen: { ar: "آخر ظهور", en: "Last Seen" },
  config: { ar: "الإعدادات", en: "Config" },
  actions: { ar: "الإجراءات", en: "Actions" },
  pause: { ar: "إيقاف مؤقت", en: "Pause" },
  resume: { ar: "استئناف", en: "Resume" },
  getStatus: { ar: "طلب الحالة", en: "Get Status" },
  restart: { ar: "إعادة تشغيل", en: "Restart" },
  saveConfig: { ar: "حفظ الإعدادات", en: "Save Config" },
  configSaved: { ar: "تم حفظ الإعدادات", en: "Config saved" },
  generateToken: { ar: "إنشاء رمز جديد", en: "Generate New Token" },
  revokeToken: { ar: "إلغاء", en: "Revoke" },
  copied: { ar: "تم النسخ!", en: "Copied!" },
  tokenLabel: { ar: "وصف الرمز", en: "Token Label" },
  loading: { ar: "جاري التحميل...", en: "Loading..." },
  online: { ar: "متصل", en: "Online" },
  offline: { ar: "غير متصل", en: "Offline" },
  error: { ar: "خطأ", en: "Error" },
  paused: { ar: "متوقف", en: "Paused" },
  editConfig: { ar: "تعديل الإعدادات", en: "Edit Config" },
  closeConfig: { ar: "إغلاق", en: "Close" },
  cycle: { ar: "الدورة", en: "Cycle" },
  tasks: { ar: "المهام", en: "Tasks" },
  uptime: { ar: "وقت التشغيل", en: "Uptime" },
  noTokens: { ar: "لا توجد رموز توثيق", en: "No auth tokens yet" },
  active: { ar: "نشط", en: "Active" },
  revoked: { ar: "ملغي", en: "Revoked" },
  lastUsed: { ar: "آخر استخدام", en: "Last Used" },
};

const STATUS_COLORS: Record<string, string> = {
  online: "#10b981",
  offline: "#64748b",
  error: "#ef4444",
  paused: "#f59e0b",
};

const STATUS_PULSE: Record<string, boolean> = {
  online: true,
  offline: false,
  error: true,
  paused: false,
};

function timeAgo(dateStr: string | null, lang: string): string {
  if (!dateStr) return "—";
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return lang === "ar" ? `منذ ${secs} ثانية` : `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return lang === "ar" ? `منذ ${mins} دقيقة` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === "ar" ? `منذ ${hrs} ساعة` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return lang === "ar" ? `منذ ${days} يوم` : `${days}d ago`;
}

function formatUptime(seconds: number): string {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function AgentConfigPanel({
  userId,
  lang = "ar",
  sendCommand,
}: {
  userId: string;
  lang?: string;
  sendCommand?: (cmd: string, params?: Record<string, any>) => boolean;
}) {
  const isRtl = lang === "ar";
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tokens, setTokens] = useState<AgentToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [configDraft, setConfigDraft] = useState("{}");
  const [configMsg, setConfigMsg] = useState("");
  const [tokenLabel, setTokenLabel] = useState("default");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/status?user_id=${userId}`);
      const data = await res.json();
      if (data.agents) setAgents(data.agents);
    } catch (e) {
      console.error("fetchAgents:", e);
    }
  }, [userId]);

  // Fetch tokens
  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/token?user_id=${userId}`);
      const data = await res.json();
      if (data.tokens) setTokens(data.tokens);
    } catch (e) {
      console.error("fetchTokens:", e);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAgents(), fetchTokens()]).finally(() => setLoading(false));
    const interval = setInterval(fetchAgents, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchAgents, fetchTokens]);

  // Generate token
  const handleGenerateToken = async () => {
    try {
      const res = await fetch("/api/agents/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, label: tokenLabel }),
      });
      const data = await res.json();
      if (data.token) {
        setTokenLabel("default");
        fetchTokens();
      }
    } catch (e) {
      console.error("generateToken:", e);
    }
  };

  // Revoke token
  const handleRevokeToken = async (tokenId: string) => {
    try {
      await fetch(`/api/agents/token?token_id=${tokenId}`, { method: "DELETE" });
      fetchTokens();
    } catch (e) {
      console.error("revokeToken:", e);
    }
  };

  // Copy token
  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Save config
  const handleSaveConfig = async (agentId: string) => {
    try {
      const parsed = JSON.parse(configDraft);
      // Send config update via WebSocket
      if (sendCommand) {
        sendCommand("update_config", { agent_id: agentId, config: parsed });
      }
      // Also persist in DB
      await fetch("/api/agents/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, agent_id: agentId, config: parsed }),
      });
      setConfigMsg(t.configSaved[lang]);
      setTimeout(() => setConfigMsg(""), 3000);
      fetchAgents();
    } catch (e) {
      setConfigMsg("Invalid JSON");
    }
  };

  // Agent commands
  const handleCommand = (cmd: string, agentId?: string) => {
    if (sendCommand) {
      sendCommand(cmd, agentId ? { target_agent: agentId } : {});
    }
  };

  // Styles
  const s = {
    container: {
      padding: "20px 0",
    } as React.CSSProperties,
    section: {
      background: "rgba(255,255,255,0.04)",
      borderRadius: "16px",
      border: "1px solid rgba(255,255,255,0.08)",
      padding: "20px",
      marginBottom: "20px",
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: "18px",
      fontWeight: 700,
      color: "#e2e8f0",
      marginBottom: "16px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    } as React.CSSProperties,
    agentCard: {
      background: "rgba(255,255,255,0.03)",
      borderRadius: "12px",
      border: "1px solid rgba(255,255,255,0.06)",
      padding: "16px",
      marginBottom: "12px",
    } as React.CSSProperties,
    agentHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "12px",
      flexWrap: "wrap" as const,
      gap: "8px",
    } as React.CSSProperties,
    agentName: {
      fontSize: "16px",
      fontWeight: 600,
      color: "#f1f5f9",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    } as React.CSSProperties,
    statusBadge: (status: string) =>
      ({
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: 600,
        color: STATUS_COLORS[status] || "#64748b",
        background: `${STATUS_COLORS[status] || "#64748b"}18`,
        border: `1px solid ${STATUS_COLORS[status] || "#64748b"}30`,
      }) as React.CSSProperties,
    dot: (status: string) =>
      ({
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: STATUS_COLORS[status] || "#64748b",
        animation: STATUS_PULSE[status] ? "pulse 2s infinite" : "none",
      }) as React.CSSProperties,
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
      gap: "8px",
      marginBottom: "12px",
    } as React.CSSProperties,
    statItem: {
      background: "rgba(255,255,255,0.03)",
      borderRadius: "8px",
      padding: "8px 12px",
      textAlign: "center" as const,
    } as React.CSSProperties,
    statLabel: {
      fontSize: "11px",
      color: "#94a3b8",
      marginBottom: "2px",
    } as React.CSSProperties,
    statValue: {
      fontSize: "14px",
      fontWeight: 600,
      color: "#e2e8f0",
    } as React.CSSProperties,
    btnRow: {
      display: "flex",
      flexWrap: "wrap" as const,
      gap: "8px",
      marginTop: "8px",
    } as React.CSSProperties,
    btn: (color: string) =>
      ({
        padding: "6px 14px",
        borderRadius: "8px",
        border: `1px solid ${color}40`,
        background: `${color}15`,
        color: color,
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s",
      }) as React.CSSProperties,
    configEditor: {
      width: "100%",
      minHeight: "120px",
      padding: "12px",
      borderRadius: "8px",
      border: "1px solid #334155",
      background: "#0f172a",
      color: "#e2e8f0",
      fontFamily: "monospace",
      fontSize: "13px",
      resize: "vertical" as const,
      marginTop: "8px",
    } as React.CSSProperties,
    tokenRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 12px",
      borderRadius: "8px",
      background: "rgba(255,255,255,0.03)",
      marginBottom: "8px",
      flexWrap: "wrap" as const,
    } as React.CSSProperties,
    tokenValue: {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#94a3b8",
      background: "#0f172a",
      padding: "4px 8px",
      borderRadius: "4px",
      flex: 1,
      minWidth: "200px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap" as const,
    } as React.CSSProperties,
    inputRow: {
      display: "flex",
      gap: "8px",
      marginTop: "12px",
      flexWrap: "wrap" as const,
    } as React.CSSProperties,
    input: {
      padding: "8px 12px",
      borderRadius: "8px",
      border: "1px solid #334155",
      background: "#0f172a",
      color: "#e2e8f0",
      fontSize: "13px",
      flex: 1,
      minWidth: "150px",
    } as React.CSSProperties,
    meta: {
      fontSize: "11px",
      color: "#64748b",
    } as React.CSSProperties,
    empty: {
      textAlign: "center" as const,
      color: "#64748b",
      padding: "24px",
      fontSize: "14px",
    } as React.CSSProperties,
    configMsg: {
      fontSize: "12px",
      color: "#10b981",
      marginTop: "4px",
    } as React.CSSProperties,
  };

  if (loading) {
    return (
      <div style={s.container}>
        <div style={s.empty}>{t.loading[lang]}</div>
      </div>
    );
  }

  return (
    <div style={s.container} dir={isRtl ? "rtl" : "ltr"}>
      {/* ─── Agents Section ─── */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          <span>🤖</span> {t.agents[lang]}
          <span style={{ ...s.meta, marginInlineStart: "auto" }}>
            {agents.length} {lang === "ar" ? "وكيل" : "agent(s)"}
          </span>
        </div>

        {agents.length === 0 ? (
          <div style={s.empty}>{t.noAgents[lang]}</div>
        ) : (
          agents.map((agent) => (
            <div key={agent.id} style={s.agentCard}>
              {/* Header */}
              <div style={s.agentHeader}>
                <div style={s.agentName}>
                  <span>{agent.agent_id}</span>
                  {agent.device_id && (
                    <span style={s.meta}>({agent.device_id})</span>
                  )}
                </div>
                <div style={s.statusBadge(agent.status)}>
                  <span style={s.dot(agent.status)} />
                  {t[agent.status]?.[lang] || agent.status}
                </div>
              </div>

              {/* Stats Grid */}
              <div style={s.statsGrid}>
                <div style={s.statItem}>
                  <div style={s.statLabel}>{t.cycle[lang]}</div>
                  <div style={s.statValue}>{agent.cycle || 0}</div>
                </div>
                <div style={s.statItem}>
                  <div style={s.statLabel}>{t.tasks[lang]}</div>
                  <div style={s.statValue}>
                    <span style={{ color: "#10b981" }}>{agent.total_ok || 0}</span>
                    {" / "}
                    <span style={{ color: "#ef4444" }}>{agent.total_fail || 0}</span>
                    {" / "}
                    <span style={{ color: "#f59e0b" }}>{agent.total_skip || 0}</span>
                  </div>
                </div>
                <div style={s.statItem}>
                  <div style={s.statLabel}>{t.uptime[lang]}</div>
                  <div style={s.statValue}>
                    {formatUptime(agent.uptime_seconds || 0)}
                  </div>
                </div>
                <div style={s.statItem}>
                  <div style={s.statLabel}>IP</div>
                  <div style={s.statValue}>{agent.ip_address || "—"}</div>
                </div>
                <div style={s.statItem}>
                  <div style={s.statLabel}>{t.lastSeen[lang]}</div>
                  <div style={s.statValue}>
                    {timeAgo(agent.last_seen, lang)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={s.btnRow}>
                {agent.status === "online" && (
                  <>
                    <button
                      style={s.btn("#f59e0b")}
                      onClick={() => handleCommand("pause", agent.agent_id)}
                    >
                      ⏸ {t.pause[lang]}
                    </button>
                    <button
                      style={s.btn("#10b981")}
                      onClick={() => handleCommand("get_status", agent.agent_id)}
                    >
                      📡 {t.getStatus[lang]}
                    </button>
                  </>
                )}
                {agent.status === "paused" && (
                  <button
                    style={s.btn("#3b82f6")}
                    onClick={() => handleCommand("resume", agent.agent_id)}
                  >
                    ▶ {t.resume[lang]}
                  </button>
                )}
                <button
                  style={s.btn("#8b5cf6")}
                  onClick={() => {
                    if (editingAgent === agent.agent_id) {
                      setEditingAgent(null);
                    } else {
                      setEditingAgent(agent.agent_id);
                      setConfigDraft(
                        JSON.stringify(agent.config || {}, null, 2)
                      );
                      setConfigMsg("");
                    }
                  }}
                >
                  {editingAgent === agent.agent_id
                    ? `✕ ${t.closeConfig[lang]}`
                    : `⚙ ${t.editConfig[lang]}`}
                </button>
              </div>

              {/* Config Editor */}
              {editingAgent === agent.agent_id && (
                <div style={{ marginTop: "12px" }}>
                  <textarea
                    style={s.configEditor}
                    value={configDraft}
                    onChange={(e) => setConfigDraft(e.target.value)}
                    spellCheck={false}
                  />
                  <div style={s.btnRow}>
                    <button
                      style={s.btn("#10b981")}
                      onClick={() => handleSaveConfig(agent.agent_id)}
                    >
                      💾 {t.saveConfig[lang]}
                    </button>
                  </div>
                  {configMsg && <div style={s.configMsg}>{configMsg}</div>}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ─── Tokens Section ─── */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          <span>🔑</span> {t.tokens[lang]}
        </div>

        {tokens.length === 0 ? (
          <div style={s.empty}>{t.noTokens[lang]}</div>
        ) : (
          tokens.map((tk) => (
            <div key={tk.id} style={s.tokenRow}>
              <div
                style={{
                  ...s.statusBadge(tk.is_active ? "online" : "offline"),
                  fontSize: "11px",
                  padding: "2px 8px",
                }}
              >
                {tk.is_active ? t.active[lang] : t.revoked[lang]}
              </div>
              <span style={{ fontSize: "13px", color: "#e2e8f0", fontWeight: 500 }}>
                {tk.label}
              </span>
              <div style={s.tokenValue}>{tk.token}</div>
              <button
                style={{ ...s.btn("#3b82f6"), padding: "4px 10px" }}
                onClick={() => handleCopyToken(tk.token)}
              >
                {copiedToken === tk.token ? `✓ ${t.copied[lang]}` : "📋"}
              </button>
              {tk.is_active && (
                <button
                  style={{ ...s.btn("#ef4444"), padding: "4px 10px" }}
                  onClick={() => handleRevokeToken(tk.id)}
                >
                  {t.revokeToken[lang]}
                </button>
              )}
              <span style={s.meta}>
                {t.lastUsed[lang]}: {timeAgo(tk.last_used, lang)}
              </span>
            </div>
          ))
        )}

        {/* Generate New Token */}
        <div style={s.inputRow}>
          <input
            style={s.input}
            value={tokenLabel}
            onChange={(e) => setTokenLabel(e.target.value)}
            placeholder={t.tokenLabel[lang]}
          />
          <button style={s.btn("#10b981")} onClick={handleGenerateToken}>
            + {t.generateToken[lang]}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
