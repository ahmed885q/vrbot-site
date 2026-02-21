"use client";

import { useState } from "react";
import { useHub, type HubMessage } from "../../lib/useHub";

const TASK_GROUPS = [
  {
    name: "Resources",
    icon: "\ud83c\udf3e",
    color: "#10b981",
    tasks: ["Gather Resources", "Collect Farms", "Open Chests", "Collect Free Items"],
  },
  {
    name: "Combat",
    icon: "\u2694\ufe0f",
    color: "#ef4444",
    tasks: ["Kill Monster", "Hunt Niflung", "Rally Niflung", "Auto Scout"],
  },
  {
    name: "Alliance",
    icon: "\ud83c\udff0",
    color: "#8b5cf6",
    tasks: ["Tribe Tech", "Tribe Gifts", "Alliance Help", "Send Gifts"],
  },
  {
    name: "Daily",
    icon: "\ud83d\udccb",
    color: "#f59e0b",
    tasks: ["Mail Rewards", "Hall of Valor", "Prosperity", "Quest Rewards"],
  },
  {
    name: "Upgrades",
    icon: "\ud83d\udd28",
    color: "#3b82f6",
    tasks: ["Building Upgrade", "Train Troops", "Research Tech", "Heal Wounded"],
  },
];

export default function AgentPanel({ userId, farmId }: { userId: string; farmId?: string }) {
  const { connected, agents, logs, runTasks, stopTasks } = useHub({ userId });
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showLogs, setShowLogs] = useState(false);

  const toggleTask = (task: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(task)) next.delete(task);
      else next.add(task);
      return next;
    });
  };

  const selectAll = () => {
    const all = TASK_GROUPS.flatMap((g) => g.tasks);
    setSelectedTasks(new Set(all));
  };

  const clearAll = () => setSelectedTasks(new Set());

  const handleRun = () => {
    if (selectedTasks.size === 0 || agents.length === 0) return;
    runTasks(farmId || "default", Array.from(selectedTasks));
  };

  const getLogColor = (msg: HubMessage) => {
    switch (msg.type) {
      case "task_complete": return "#34d399";
      case "task_error":
      case "error": return "#f87171";
      case "command": return "#818cf8";
      case "agent_online": return "#34d399";
      case "agent_offline": return "#f87171";
      default: return "rgba(255,255,255,0.4)";
    }
  };

  const getLogText = (msg: HubMessage) => {
    switch (msg.type) {
      case "task_status": return `${msg.payload?.status}: ${msg.payload?.task || msg.payload?.currentTask || ""}`;
      case "task_complete": return `Completed: ${msg.payload?.task}`;
      case "task_error": return `Error: ${msg.payload?.error}`;
      case "error": return `Error: ${msg.payload?.text}`;
      case "log": return msg.payload?.message;
      case "agent_online": return "Agent connected";
      case "agent_offline": return "Agent disconnected";
      case "command": return `Sent: ${msg.payload?.tasks?.join(", ") || msg.payload?.text}`;
      case "system": return msg.payload?.text;
      default: return msg.type;
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      {/* === AGENT STATUS BAR === */}
      <div style={{
        background: connected && agents.length > 0
          ? "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))"
          : "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))",
        borderRadius: 14,
        padding: "16px 22px",
        marginBottom: 16,
        border: `1px solid ${connected && agents.length > 0 ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 12, height: 12, borderRadius: "50%",
            background: connected && agents.length > 0 ? "#10b981" : "#ef4444",
            boxShadow: connected && agents.length > 0 ? "0 0 8px rgba(16,185,129,0.5)" : "none",
            animation: connected && agents.length > 0 ? "pulse 2s infinite" : "none",
          }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
              {connected && agents.length > 0
                ? `Agent Online (${agents.length})`
                : connected
                ? "Hub Connected - No Agents"
                : "Disconnected"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              {connected && agents.length > 0
                ? `Device: ${agents[0].deviceId || "Unknown"}`
                : "Run vrbot_main.py --hub on your PC"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowLogs(!showLogs)} style={{
            padding: "6px 14px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            color: "rgba(255,255,255,0.5)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}>
            {showLogs ? "Hide Logs" : `Logs (${logs.length})`}
          </button>
        </div>
      </div>

      {/* === TASK SELECTOR === */}
      {connected && agents.length > 0 && (
        <div style={{
          background: "rgba(255,255,255,0.02)",
          borderRadius: 14,
          padding: "20px",
          border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 16,
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
              Select Tasks to Run
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={selectAll} style={{
                padding: "4px 10px",
                background: "rgba(139,92,246,0.1)",
                border: "1px solid rgba(139,92,246,0.2)",
                borderRadius: 6,
                color: "#a78bfa",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}>
                Select All
              </button>
              <button onClick={clearAll} style={{
                padding: "4px 10px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                color: "rgba(255,255,255,0.4)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}>
                Clear
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {TASK_GROUPS.map((group) => (
              <div key={group.name} style={{
                background: "rgba(255,255,255,0.02)",
                borderRadius: 10,
                padding: "12px",
                border: `1px solid ${group.color}15`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>{group.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: group.color }}>{group.name}</span>
                </div>
                {group.tasks.map((task) => (
                  <label key={task} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 0",
                    cursor: "pointer",
                    fontSize: 12,
                    color: selectedTasks.has(task) ? "#fff" : "rgba(255,255,255,0.4)",
                    transition: "color 0.15s",
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task)}
                      onChange={() => toggleTask(task)}
                      style={{ accentColor: group.color, cursor: "pointer" }}
                    />
                    {task}
                  </label>
                ))}
              </div>
            ))}
          </div>

          {/* Run / Stop buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={handleRun} disabled={selectedTasks.size === 0} style={{
              flex: 1,
              padding: "12px",
              background: selectedTasks.size > 0
                ? "linear-gradient(135deg, #10b981, #059669)"
                : "rgba(255,255,255,0.04)",
              color: selectedTasks.size > 0 ? "#fff" : "rgba(255,255,255,0.3)",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: selectedTasks.size > 0 ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}>
              ▶ Run {selectedTasks.size > 0 ? `(${selectedTasks.size} tasks)` : ""}
            </button>
            <button onClick={stopTasks} style={{
              padding: "12px 24px",
              background: "rgba(239,68,68,0.1)",
              color: "#f87171",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}>
              ⏹ Stop
            </button>
          </div>
        </div>
      )}

      {/* === LIVE LOGS === */}
      {showLogs && (
        <div style={{
          background: "#0d1117",
          borderRadius: 12,
          padding: "14px",
          border: "1px solid rgba(255,255,255,0.06)",
          maxHeight: 260,
          overflowY: "auto",
          fontFamily: "monospace",
        }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>
            Live Logs ({logs.length})
          </div>
          {logs.length === 0 ? (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: 20 }}>
              No logs yet...
            </div>
          ) : (
            logs.slice().reverse().map((log, i) => (
              <div key={i} style={{
                fontSize: 11,
                color: getLogColor(log),
                padding: "3px 0",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
              }}>
                <span style={{ color: "rgba(255,255,255,0.15)", marginRight: 8 }}>
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ""}
                </span>
                {getLogText(log)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
