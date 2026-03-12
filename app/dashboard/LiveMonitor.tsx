"use client";

import { useState } from "react";
import type { AgentLiveStatus, AgentAlert } from "../../lib/useHub";

type Lang = "ar" | "en";

const tx: Record<Lang, Record<string, string>> = {
  ar: {
    liveMonitor: "المراقبة الحية",
    state: "الحالة",
    currentTask: "المهمة الحالية",
    cycle: "الدورة",
    success: "نجاح",
    failed: "فشل",
    skipped: "تخطي",
    uptime: "وقت التشغيل",
    restarts: "إعادة تشغيل",
    captchas: "كابتشا",
    lastError: "آخر خطأ",
    alerts: "التنبيهات",
    clearAlerts: "مسح",
    noAlerts: "لا توجد تنبيهات",
    stats: "الإحصائيات",
    recovered: "تم التعافي",
    notRecovered: "لم يتعافَ",
    ago: "منذ",
    offline: "غير متصل",
    noTask: "لا يوجد",
  },
  en: {
    liveMonitor: "Live Monitor",
    state: "State",
    currentTask: "Current Task",
    cycle: "Cycle",
    success: "Success",
    failed: "Failed",
    skipped: "Skipped",
    uptime: "Uptime",
    restarts: "Restarts",
    captchas: "Captchas",
    lastError: "Last Error",
    alerts: "Alerts",
    clearAlerts: "Clear",
    noAlerts: "No alerts",
    stats: "Stats",
    recovered: "Recovered",
    notRecovered: "Not recovered",
    ago: "ago",
    offline: "Offline",
    noTask: "None",
  },
};

// ── State Colors & Icons ──
const STATE_CONFIG: Record<string, { color: string; icon: string; label_ar: string; label_en: string }> = {
  RUNNING:        { color: "#10b981", icon: "▶", label_ar: "يعمل",      label_en: "Running" },
  STARTING:       { color: "#3b82f6", icon: "⏳", label_ar: "يبدأ",      label_en: "Starting" },
  PAUSED:         { color: "#f59e0b", icon: "⏸", label_ar: "متوقف مؤقتاً", label_en: "Paused" },
  CAPTCHA_WAIT:   { color: "#f59e0b", icon: "🔒", label_ar: "كابتشا",    label_en: "Captcha" },
  ERROR_RECOVERY: { color: "#ef4444", icon: "🔄", label_ar: "استعادة",   label_en: "Recovering" },
  SHUTTING_DOWN:  { color: "#64748b", icon: "⏹", label_ar: "يُغلق",     label_en: "Shutting Down" },
  STOPPED:        { color: "#64748b", icon: "⏹", label_ar: "متوقف",     label_en: "Stopped" },
  OFFLINE:        { color: "#475569", icon: "●", label_ar: "غير متصل",  label_en: "Offline" },
};

function formatUptime(seconds: number): string {
  if (seconds <= 0) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function timeAgo(timestamp: number): string {
  if (!timestamp) return "";
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

export default function LiveMonitor({
  agentStatus,
  alerts,
  onClearAlerts,
  lang = "ar",
  agentOnline = false,
}: {
  agentStatus: AgentLiveStatus;
  alerts: AgentAlert[];
  onClearAlerts: () => void;
  lang?: Lang;
  agentOnline?: boolean;
}) {
  const [showAlerts, setShowAlerts] = useState(false);
  const s = tx[lang];
  const isRtl = lang === "ar";

  const st = STATE_CONFIG[agentStatus.state] || STATE_CONFIG.OFFLINE;
  const stateLabel = lang === "ar" ? st.label_ar : st.label_en;
  const totalTasks = agentStatus.total_ok + agentStatus.total_fail + agentStatus.total_skip;
  const successRate = totalTasks > 0 ? Math.round((agentStatus.total_ok / totalTasks) * 100) : 0;

  // Don't render if agent is offline and no data
  if (!agentOnline && agentStatus.state === "OFFLINE") return null;

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 14, padding: "18px", border: `1px solid ${st.color}20`, marginBottom: 20 }}>
      {/* Header: State + Task */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* State indicator */}
          <div style={{
            padding: "6px 14px",
            background: `${st.color}15`,
            borderRadius: 8,
            border: `1px solid ${st.color}30`,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            <span style={{ fontSize: 14 }}>{st.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: st.color }}>{stateLabel}</span>
          </div>

          {/* Current task */}
          {agentStatus.current_task && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{s.currentTask}:</span>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#fff",
                padding: "3px 10px",
                background: "rgba(139,92,246,0.1)",
                borderRadius: 6,
                border: "1px solid rgba(139,92,246,0.2)",
              }}>
                {agentStatus.current_task}
                {agentStatus.task_state && agentStatus.task_state !== "running" && (
                  <span style={{ color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>({agentStatus.task_state})</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Alerts badge */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {alerts.length > 0 && (
            <button onClick={() => setShowAlerts(!showAlerts)} style={{
              padding: "5px 12px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 6,
              color: "#f87171",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#ef4444",
                animation: "pulse 2s infinite",
              }} />
              {s.alerts} ({alerts.length})
            </button>
          )}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
            {s.cycle} #{agentStatus.cycle}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: alerts.length > 0 && showAlerts ? 14 : 0 }}>
        {/* Success */}
        <div style={{ background: "rgba(16,185,129,0.06)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>{agentStatus.total_ok}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{s.success}</div>
        </div>
        {/* Failed */}
        <div style={{ background: "rgba(239,68,68,0.06)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#ef4444" }}>{agentStatus.total_fail}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{s.failed}</div>
        </div>
        {/* Skipped */}
        <div style={{ background: "rgba(245,158,11,0.06)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>{agentStatus.total_skip}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{s.skipped}</div>
        </div>
        {/* Success rate */}
        <div style={{ background: "rgba(99,102,241,0.06)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#6366f1" }}>{successRate}%</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{s.stats}</div>
        </div>
        {/* Uptime */}
        <div style={{ background: "rgba(59,130,246,0.06)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#3b82f6" }}>{formatUptime(agentStatus.uptime_seconds)}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{s.uptime}</div>
        </div>
        {/* Restarts */}
        <div style={{ background: "rgba(239,68,68,0.04)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: agentStatus.game_restarts > 0 ? "#f87171" : "rgba(255,255,255,0.2)" }}>{agentStatus.game_restarts}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{s.restarts}</div>
        </div>
        {/* Captchas */}
        <div style={{ background: "rgba(245,158,11,0.04)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: agentStatus.captchas_detected > 0 ? "#f59e0b" : "rgba(255,255,255,0.2)" }}>{agentStatus.captchas_detected}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{s.captchas}</div>
        </div>
      </div>

      {/* Last Error */}
      {agentStatus.last_error && (
        <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(239,68,68,0.06)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.12)" }}>
          <span style={{ fontSize: 11, color: "#f87171" }}>{s.lastError}: {agentStatus.last_error}</span>
        </div>
      )}

      {/* Alerts Panel */}
      {showAlerts && alerts.length > 0 && (
        <div style={{ marginTop: 10, background: "#0d1117", borderRadius: 10, padding: "12px", border: "1px solid rgba(239,68,68,0.15)", maxHeight: 180, overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#f87171" }}>{s.alerts}</span>
            <button onClick={onClearAlerts} style={{
              padding: "2px 8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 4, color: "#f87171", fontSize: 10, cursor: "pointer",
            }}>{s.clearAlerts}</button>
          </div>
          {alerts.slice().reverse().map((a, i) => (
            <div key={i} style={{
              padding: "6px 8px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}>
              <div>
                <span style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 3,
                  fontWeight: 700,
                  marginRight: 6,
                  background: a.alert_type === "task_final_failure" ? "rgba(239,68,68,0.15)" :
                              a.alert_type === "captcha" ? "rgba(245,158,11,0.15)" : "rgba(99,102,241,0.15)",
                  color: a.alert_type === "task_final_failure" ? "#f87171" :
                         a.alert_type === "captcha" ? "#f59e0b" : "#818cf8",
                }}>
                  {a.alert_type}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                  {a.message || a.task || ""}
                  {a.recovered !== undefined && (
                    <span style={{ color: a.recovered ? "#10b981" : "#ef4444", marginLeft: 6, fontSize: 10 }}>
                      ({a.recovered ? s.recovered : s.notRecovered})
                    </span>
                  )}
                </span>
              </div>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", whiteSpace: "nowrap" }}>
                {timeAgo(a.timestamp)} {s.ago}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
