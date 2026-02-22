"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { useHub, type HubMessage } from "../../lib/useHub";

type Lang = "ar" | "en";
type TokenInfo = { tokens_total: number; tokens_used: number; tokens_available: number; trial_granted: boolean; trial_expired: boolean; trial_expires_at?: string };
type Farm = { id: string; name: string; server: string | null; notes: string | null; created_at: string; bot_enabled?: boolean; bot_status?: string };

const tx: Record<Lang, Record<string, string>> = {
  ar: { title: "لوحة التحكم", welcome: "مرحباً", tokens: "التوكنات", available: "متاح", used: "مستخدم", total: "الإجمالي", trial: "تجربة مجانية", trialExpires: "تنتهي في", trialExpired: "انتهت التجربة", buyMore: "شراء مزارع", farms: "المزارع", noFarms: "لا توجد مزارع", noFarmsDesc: "أضف مزرعتك الأولى", addFarm: "إضافة مزرعة", farmName: "اسم المزرعة", farmServer: "السيرفر (اختياري)", farmNotes: "ملاحظات (اختياري)", cancel: "إلغاء", create: "إنشاء", creating: "جاري الإنشاء...", deleteFarm: "حذف", deleteConfirm: "حذف هذه المزرعة؟", loading: "جاري التحميل...", logout: "تسجيل خروج", selectAll: "تحديد الكل", deselectAll: "إلغاء التحديد", runSelected: "تشغيل المحدد", stopAll: "إيقاف الكل", selected: "محدد", online: "متصل", offline: "غير متصل", running: "يعمل", idle: "خامل", error: "خطأ", search: "بحث...", tasks: "المهام", bulkActions: "تحكم جماعي", farmStatus: "حالة المزرعة", noAgent: "شغّل الـ Agent", agentOnline: "Agent متصل", selectFarm: "اختر مزرعة", selectTasks: "اختر المهام", logs: "السجلات" },
  en: { title: "Dashboard", welcome: "Welcome", tokens: "Tokens", available: "Available", used: "Used", total: "Total", trial: "Free Trial", trialExpires: "Expires", trialExpired: "Trial expired", buyMore: "Buy Farms", farms: "Farms", noFarms: "No farms yet", noFarmsDesc: "Add your first farm", addFarm: "Add Farm", farmName: "Farm name", farmServer: "Server (optional)", farmNotes: "Notes (optional)", cancel: "Cancel", create: "Create", creating: "Creating...", deleteFarm: "Delete", deleteConfirm: "Delete this farm?", loading: "Loading...", logout: "Logout", selectAll: "Select All", deselectAll: "Deselect All", runSelected: "Run Selected", stopAll: "Stop All", selected: "Selected", online: "Online", offline: "Offline", running: "Running", idle: "Idle", error: "Error", search: "Search...", tasks: "Tasks", bulkActions: "Bulk Actions", farmStatus: "Farm Status", noAgent: "Run the Agent", agentOnline: "Agent Online", selectFarm: "Select a farm", selectTasks: "Select tasks", logs: "Logs" },
};

const TASK_GROUPS = [
  { key: "resources", icon: "🌾", color: "#10b981", tasks: ["Gather Resources", "Collect Farms", "Open Chests", "Collect Free Items"] },
  { key: "combat", icon: "⚔️", color: "#ef4444", tasks: ["Kill Monster", "Hunt Niflung", "Rally Niflung", "Auto Scout"] },
  { key: "alliance", icon: "🏰", color: "#8b5cf6", tasks: ["Tribe Tech", "Tribe Gifts", "Alliance Help", "Send Gifts"] },
  { key: "daily", icon: "📋", color: "#f59e0b", tasks: ["Mail Rewards", "Hall of Valor", "Prosperity", "Quest Rewards"] },
  { key: "upgrade", icon: "🔨", color: "#3b82f6", tasks: ["Building Upgrade", "Train Troops", "Research Tech", "Heal Wounded"] },
];

export default function DashboardClient() {
  const [lang, setLang] = useState<Lang>("ar");
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [tokens, setTokens] = useState<TokenInfo | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [checkedFarms, setCheckedFarms] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [farmSearch, setFarmSearch] = useState("");
  const [showAddFarm, setShowAddFarm] = useState(false);
  const [newFarmName, setNewFarmName] = useState("");
  const [newFarmServer, setNewFarmServer] = useState("");
  const [newFarmNotes, setNewFarmNotes] = useState("");
  const [addingFarm, setAddingFarm] = useState(false);
  const [farmError, setFarmError] = useState("");
  const [showLogs, setShowLogs] = useState(false);
  const [farmStatuses, setFarmStatuses] = useState<Record<string, { status: string; task?: string; updated: number }>>({});
  const [view, setView] = useState<"grid" | "list">("grid");
  const [msg, setMsg] = useState("");

  const s = tx[lang];
  const isRtl = lang === "ar";

  // Hub connection
  const hubData = useHub({
    userId: user?.id || "",
    onMessage: useCallback((m: HubMessage) => {
      if (m.type === "task_status" && m.payload?.farmId) {
        setFarmStatuses(prev => ({ ...prev, [m.payload.farmId]: { status: m.payload.status || "running", task: m.payload.task || m.payload.currentTask, updated: Date.now() } }));
      }
      if (m.type === "task_complete" && m.payload?.farmId) {
        setFarmStatuses(prev => ({ ...prev, [m.payload.farmId]: { status: "idle", task: undefined, updated: Date.now() } }));
      }
      if (m.type === "task_error" && m.payload?.farmId) {
        setFarmStatuses(prev => ({ ...prev, [m.payload.farmId]: { status: "error", task: m.payload.error, updated: Date.now() } }));
      }
    }, []),
    autoConnect: !!user?.id,
  });
  const { connected, agents, logs, runTasks, stopTasks } = hubData;
  const agentOnline = connected && agents.length > 0;

  useEffect(() => { try { const sv = localStorage.getItem("vrbot_lang") as Lang; if (sv && tx[sv]) setLang(sv); } catch {} setMounted(true); }, []);
  useEffect(() => { if (!mounted) return; const sb = createSupabaseBrowserClient(); sb.auth.getUser().then(({ data }) => { setUser(data.user); setLoadingUser(false); }); }, [mounted]);

  const loadTokens = useCallback(async () => {
    setLoadingTokens(true);
    try { const res = await fetch("/api/tokens/status"); if (res.ok) { const d = await res.json(); if (d.tokens_total === 0 && !d.trial_granted) { const tr = await fetch("/api/tokens/grant-trial", { method: "POST" }); if (tr.ok) { const r2 = await fetch("/api/tokens/status"); if (r2.ok) { setTokens(await r2.json()); setLoadingTokens(false); return; } } } setTokens(d); } } catch {} setLoadingTokens(false);
  }, []);

  const loadFarms = useCallback(async () => {
    setLoadingFarms(true);
    try { const res = await fetch("/api/farms/list"); if (res.ok) { const d = await res.json(); const fl = d.farms || []; setFarms(fl); if (fl.length > 0 && !selectedFarmId) setSelectedFarmId(fl[0].id); } } catch {} setLoadingFarms(false);
  }, [selectedFarmId]);

  useEffect(() => { if (user) { loadTokens(); loadFarms(); } }, [user, loadTokens, loadFarms]);

  async function handleAddFarm() {
    if (!newFarmName.trim()) return;
    setAddingFarm(true); setFarmError("");
    try { const res = await fetch("/api/farms/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newFarmName, server: newFarmServer || null, notes: newFarmNotes || null }) }); const d = await res.json(); if (!res.ok) setFarmError(d.error || "Error"); else { setShowAddFarm(false); setNewFarmName(""); setNewFarmServer(""); setNewFarmNotes(""); loadFarms(); loadTokens(); if (d.farm?.id) setSelectedFarmId(d.farm.id); } } catch { setFarmError("Error"); } setAddingFarm(false);
  }

  async function handleDeleteFarm(farmId: string) {
    if (!confirm(s.deleteConfirm)) return;
    try { const res = await fetch(`/api/farms/delete?id=${farmId}`, { method: "DELETE" }); if (res.ok) { if (selectedFarmId === farmId) setSelectedFarmId(null); checkedFarms.delete(farmId); setCheckedFarms(new Set(checkedFarms)); loadFarms(); loadTokens(); } } catch {}
  }

  const filteredFarms = useMemo(() => {
    if (!farmSearch) return farms;
    const q = farmSearch.toLowerCase();
    return farms.filter(f => f.name.toLowerCase().includes(q) || f.server?.toLowerCase().includes(q));
  }, [farms, farmSearch]);

  function toggleCheck(id: string) { setCheckedFarms(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }
  function toggleAllChecked() { if (checkedFarms.size === filteredFarms.length) setCheckedFarms(new Set()); else setCheckedFarms(new Set(filteredFarms.map(f => f.id))); }
  function toggleTask(t: string) { setSelectedTasks(prev => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n; }); }

  function handleRunSelected() {
    if (selectedTasks.size === 0 || !agentOnline) return;
    const targets = checkedFarms.size > 0 ? Array.from(checkedFarms) : selectedFarmId ? [selectedFarmId] : [];
    if (targets.length === 0) return;
    targets.forEach(fid => {
      runTasks(fid, Array.from(selectedTasks));
      setFarmStatuses(prev => ({ ...prev, [fid]: { status: "running", task: "Starting...", updated: Date.now() } }));
    });
    setMsg(`▶ Running ${selectedTasks.size} tasks on ${targets.length} farm${targets.length > 1 ? "s" : ""}`);
    setTimeout(() => setMsg(""), 3000);
  }

  function handleStopAll() {
    stopTasks();
    setFarmStatuses({});
    setMsg("⏹ All tasks stopped");
    setTimeout(() => setMsg(""), 3000);
  }

  function getFarmStatus(id: string) { return farmStatuses[id] || { status: "idle" }; }
  function statusColor(st: string) { return st === "running" ? "#10b981" : st === "error" ? "#ef4444" : "#64748b"; }
  function statusIcon(st: string) { return st === "running" ? "🔄" : st === "error" ? "❌" : "⏸️"; }

  const getLogColor = (m: HubMessage) => { switch (m.type) { case "task_complete": return "#34d399"; case "task_error": case "error": return "#f87171"; case "command": return "#818cf8"; case "agent_online": return "#34d399"; case "agent_offline": return "#f87171"; default: return "rgba(255,255,255,0.4)"; } };
  const getLogText = (m: HubMessage) => { switch (m.type) { case "task_status": return `${m.payload?.status}: ${m.payload?.task || ""}`; case "task_complete": return `✅ ${m.payload?.task}`; case "task_error": return `❌ ${m.payload?.error}`; case "error": return `Error: ${m.payload?.text}`; case "log": return m.payload?.message; case "agent_online": return "Agent connected"; case "agent_offline": return "Agent disconnected"; case "command": return `▶ ${m.payload?.tasks?.join(", ") || m.payload?.text}`; case "system": return m.payload?.text; default: return m.type; } };

  if (!mounted || loadingUser) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0f1a" }}><div style={{ color: "#64748b" }}>Loading...</div></div>;
  if (!user) { window.location.href = "/login"; return null; }

  const daysLeft = tokens?.trial_expires_at ? Math.max(0, Math.ceil((new Date(tokens.trial_expires_at).getTime() - Date.now()) / 86400000)) : 0;
  const runningCount = Object.values(farmStatuses).filter(s => s.status === "running").length;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "#0b0f1a", fontFamily: "Segoe UI, sans-serif" }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}button:hover{opacity:.85}`}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #0f1629, #1a1145)", borderBottom: "1px solid rgba(139,92,246,0.15)", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>🤖 {s.title}</h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{s.welcome}, {user.email?.split("@")[0]}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} style={{ padding: "6px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff", fontSize: 12, cursor: "pointer" }}>{lang === "ar" ? "EN" : "عربي"}</button>
          <a href="/billing" style={{ padding: "8px 16px", background: "linear-gradient(135deg, #7c3aed, #6366f1)", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 12, fontWeight: 700 }}>{s.buyMore}</a>
          <a href="/auth/logout" style={{ padding: "8px 12px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", borderRadius: 8, textDecoration: "none", fontSize: 11, border: "1px solid rgba(255,255,255,0.08)" }}>{s.logout}</a>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px" }}>

        {/* TOP STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
          {[
            { v: farms.length, l: s.farms, icon: "🌾", c: "#10b981" },
            { v: tokens?.tokens_available ?? 0, l: s.available, icon: "🎫", c: "#a78bfa" },
            { v: runningCount, l: s.running, icon: "🔄", c: "#3b82f6" },
            { v: agents.length, l: agentOnline ? s.agentOnline : s.noAgent, icon: agentOnline ? "🟢" : "🔴", c: agentOnline ? "#10b981" : "#ef4444" },
          ].map((st, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "14px 16px", border: `1px solid ${st.c}20`, animation: `fadeIn ${0.3 + i * 0.1}s ease` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{st.l}</div><div style={{ fontSize: 24, fontWeight: 800, color: st.c, marginTop: 2 }}>{st.v}</div></div>
                <span style={{ fontSize: 24, opacity: 0.4 }}>{st.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {msg && <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "#34d399", fontSize: 13, fontWeight: 600 }}>{msg}</div>}

        {/* AGENT STATUS + TASK SELECTOR */}
        {agentOnline && (
          <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 14, padding: "18px", border: "1px solid rgba(16,185,129,0.15)", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px rgba(16,185,129,0.5)", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Agent Online ({agents.length})</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{agents[0]?.deviceId || ""}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { const all = TASK_GROUPS.flatMap(g => g.tasks); setSelectedTasks(new Set(all)); }} style={{ padding: "4px 10px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 6, color: "#a78bfa", fontSize: 11, cursor: "pointer" }}>{s.selectAll}</button>
                <button onClick={() => setSelectedTasks(new Set())} style={{ padding: "4px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer" }}>Clear</button>
                <button onClick={() => setShowLogs(!showLogs)} style={{ padding: "4px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer" }}>{s.logs} ({logs.length})</button>
              </div>
            </div>

            {/* Tasks grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, marginBottom: 14 }}>
              {TASK_GROUPS.map(g => (
                <div key={g.key} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "10px", border: `1px solid ${g.color}15` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{g.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: g.color }}>{g.key}</span>
                  </div>
                  {g.tasks.map(t => (
                    <label key={t} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", cursor: "pointer", fontSize: 11, color: selectedTasks.has(t) ? "#fff" : "rgba(255,255,255,0.4)" }}>
                      <input type="checkbox" checked={selectedTasks.has(t)} onChange={() => toggleTask(t)} style={{ accentColor: g.color, cursor: "pointer" }} />{t}
                    </label>
                  ))}
                </div>
              ))}
            </div>

            {/* BULK ACTION BAR */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={handleRunSelected} disabled={selectedTasks.size === 0} style={{ padding: "10px 20px", background: selectedTasks.size > 0 ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(255,255,255,0.04)", color: selectedTasks.size > 0 ? "#fff" : "rgba(255,255,255,0.3)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: selectedTasks.size > 0 ? "pointer" : "not-allowed" }}>
                ▶ {s.runSelected} {checkedFarms.size > 0 ? `(${checkedFarms.size} ${s.farms})` : selectedFarmId ? "(1)" : ""} {selectedTasks.size > 0 ? `• ${selectedTasks.size} ${s.tasks}` : ""}
              </button>
              <button onClick={handleStopAll} style={{ padding: "10px 16px", background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>⏹ {s.stopAll}</button>
              {checkedFarms.size > 0 && <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>✓ {checkedFarms.size} {s.selected}</span>}
            </div>
          </div>
        )}

        {/* NOT CONNECTED */}
        {!agentOnline && user && (
          <div style={{ background: "rgba(239,68,68,0.06)", borderRadius: 14, padding: "20px", border: "1px solid rgba(239,68,68,0.15)", marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "#f87171", fontWeight: 600 }}>🔴 {connected ? "Hub Connected - No Agents" : "Disconnected"}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Run <code style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>vrbot_main.py --hub</code> on your PC</div>
          </div>
        )}

        {/* LOGS */}
        {showLogs && (
          <div style={{ background: "#0d1117", borderRadius: 12, padding: "12px", border: "1px solid rgba(255,255,255,0.06)", maxHeight: 200, overflowY: "auto", fontFamily: "monospace", marginBottom: 16 }}>
            {logs.length === 0 ? <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: 16 }}>No logs yet...</div> :
              logs.slice().reverse().map((l, i) => (
                <div key={i} style={{ fontSize: 11, color: getLogColor(l), padding: "2px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <span style={{ color: "rgba(255,255,255,0.15)", marginRight: 6 }}>{l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : ""}</span>
                  {getLogText(l)}
                </div>
              ))
            }
          </div>
        )}

        {/* FARMS HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>🌾 {s.farms} ({farms.length})</h2>
            {farms.length > 5 && <input value={farmSearch} onChange={e => setFarmSearch(e.target.value)} placeholder={s.search} style={{ padding: "6px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff", fontSize: 12, width: 180 }} />}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {farms.length > 1 && <button onClick={toggleAllChecked} style={{ padding: "6px 12px", background: checkedFarms.size === filteredFarms.length ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 6, color: "#a78bfa", fontSize: 11, cursor: "pointer" }}>☑ {checkedFarms.size === filteredFarms.length ? s.deselectAll : s.selectAll}</button>}
            <button onClick={() => setView(view === "grid" ? "list" : "grid")} style={{ padding: "6px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer" }}>{view === "grid" ? "☰ List" : "▦ Grid"}</button>
            <button onClick={() => { if (tokens && tokens.tokens_available > 0) { setShowAddFarm(true); setFarmError(""); } }} style={{ padding: "6px 14px", background: tokens && tokens.tokens_available > 0 ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(255,255,255,0.06)", color: tokens && tokens.tokens_available > 0 ? "#fff" : "rgba(255,255,255,0.3)", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: tokens && tokens.tokens_available > 0 ? "pointer" : "not-allowed" }}>+ {s.addFarm}</button>
          </div>
        </div>

        {/* FARMS GRID/LIST */}
        {loadingFarms ? <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)" }}>{s.loading}</div> :
        farms.length === 0 ? (
          <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: "48px 24px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🌾</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{s.noFarms}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>{s.noFarmsDesc}</div>
          </div>
        ) : view === "list" ? (
          /* LIST VIEW */
          <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["", "Name", "Server", "Status", "Task", "Created", ""].map((h, i) => <th key={i} style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", textAlign: "left", fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{h}</th>)}</tr></thead>
              <tbody>{filteredFarms.map(f => {
                const st = getFarmStatus(f.id); const isSel = f.id === selectedFarmId; const isChk = checkedFarms.has(f.id);
                return (
                  <tr key={f.id} onClick={() => setSelectedFarmId(f.id)} style={{ cursor: "pointer", background: isSel ? "rgba(139,92,246,0.06)" : "transparent" }}>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}><input type="checkbox" checked={isChk} onChange={(e) => { e.stopPropagation(); toggleCheck(f.id); }} style={{ accentColor: "#a78bfa" }} /></td>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)", fontWeight: 600, color: "#fff", fontSize: 13 }}>{f.name}</td>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{f.server || "-"}</td>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}><span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, color: statusColor(st.status), background: statusColor(st.status) + "15" }}>{statusIcon(st.status)} {st.status}</span></td>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{st.task || "-"}</td>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{new Date(f.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}><button onClick={(e) => { e.stopPropagation(); handleDeleteFarm(f.id); }} style={{ padding: "3px 8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 4, color: "#f87171", fontSize: 10, cursor: "pointer" }}>✕</button></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        ) : (
          /* GRID VIEW */
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${farms.length > 20 ? "200px" : "300px"}, 1fr))`, gap: 10 }}>
            {filteredFarms.map((f, i) => {
              const st = getFarmStatus(f.id); const isSel = f.id === selectedFarmId; const isChk = checkedFarms.has(f.id);
              return (
                <div key={f.id} onClick={() => setSelectedFarmId(f.id)} style={{
                  background: isSel ? "rgba(139,92,246,0.08)" : isChk ? "rgba(139,92,246,0.04)" : "rgba(255,255,255,0.03)",
                  borderRadius: 12, padding: farms.length > 20 ? "12px" : "16px",
                  border: isSel ? "2px solid rgba(139,92,246,0.5)" : isChk ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer", transition: "all 0.2s", position: "relative", animation: `fadeIn ${0.2 + (i % 20) * 0.03}s ease`,
                }}>
                  {/* Checkbox */}
                  <input type="checkbox" checked={isChk} onChange={(e) => { e.stopPropagation(); toggleCheck(f.id); }} style={{ position: "absolute", top: 10, [isRtl ? "left" : "right"]: 10, accentColor: "#a78bfa", cursor: "pointer" }} />

                  {/* Farm info */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${statusColor(st.status)}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{statusIcon(st.status)}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{f.name}</div>
                      {f.server && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{f.server}</div>}
                    </div>
                  </div>

                  {/* Status */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: `${statusColor(st.status)}15`, color: statusColor(st.status), fontWeight: 600 }}>{st.status}{st.task ? ` • ${st.task}` : ""}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteFarm(f.id); }} style={{ padding: "2px 6px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 4, color: "#f87171", fontSize: 10, cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD FARM MODAL */}
      {showAddFarm && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }} onClick={() => setShowAddFarm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#1a1f2e", borderRadius: 16, padding: "24px", width: "100%", maxWidth: 400, border: "1px solid rgba(139,92,246,0.2)" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#fff" }}>🌾 {s.addFarm}</h3>
            <div style={{ display: "grid", gap: 10 }}>
              <input placeholder={s.farmName} value={newFarmName} onChange={e => setNewFarmName(e.target.value)} autoFocus style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, outline: "none" }} />
              <input placeholder={s.farmServer} value={newFarmServer} onChange={e => setNewFarmServer(e.target.value)} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, outline: "none" }} />
              <input placeholder={s.farmNotes} value={newFarmNotes} onChange={e => setNewFarmNotes(e.target.value)} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, outline: "none" }} />
              {farmError && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 12 }}>{farmError}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={() => setShowAddFarm(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" }}>{s.cancel}</button>
                <button onClick={handleAddFarm} disabled={addingFarm || !newFarmName.trim()} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: addingFarm ? "rgba(139,92,246,0.3)" : "linear-gradient(135deg, #7c3aed, #6366f1)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: addingFarm ? "not-allowed" : "pointer" }}>{addingFarm ? s.creating : s.create}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
