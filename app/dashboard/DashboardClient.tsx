"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

type Lang = "ar" | "en" | "ru" | "zh";

type TokenInfo = {
  tokens_total: number;
  tokens_used: number;
  tokens_available: number;
  trial_granted: boolean;
  trial_expired: boolean;
  trial_expires_at?: string;
};

type Farm = {
  id: string;
  name: string;
  server: string | null;
  notes: string | null;
  created_at: string;
};

// =========== TRANSLATIONS ===========
const tx: Record<Lang, Record<string, string>> = {
  ar: {
    title: "لوحة التحكم",
    welcome: "مرحباً",
    tokens: "التوكنات",
    available: "متاح",
    used: "مستخدم",
    total: "الإجمالي",
    trial: "تجربة مجانية",
    trialExpires: "تنتهي في",
    trialExpired: "انتهت التجربة المجانية",
    buyMore: "شراء مزارع",
    farms: "المزارع",
    noFarms: "لا توجد مزارع بعد",
    noFarmsDesc: "أضف مزرعتك الأولى لبدء الأتمتة",
    addFarm: "إضافة مزرعة",
    farmName: "اسم المزرعة",
    farmServer: "السيرفر (اختياري)",
    farmNotes: "ملاحظات (اختياري)",
    cancel: "إلغاء",
    create: "إنشاء",
    creating: "جاري الإنشاء...",
    deleteFarm: "حذف",
    deleteConfirm: "هل أنت متأكد من حذف هذه المزرعة؟",
    tasks: "المهام",
    status: "الحالة",
    active: "نشط",
    inactive: "غير نشط",
    server: "السيرفر",
    created: "تاريخ الإنشاء",
    noTokens: "لا توجد توكنات متاحة",
    noTokensDesc: "اشترك أولاً لإضافة مزارع",
    loading: "جاري التحميل...",
    logout: "تسجيل خروج",
    quickStats: "إحصائيات سريعة",
    activeFarms: "مزارع نشطة",
    availableTokens: "توكنات متاحة",
    taskGroups: "مجموعات المهام",
    resources: "جمع الموارد",
    combat: "القتال",
    alliance: "التحالف",
    daily: "المهام اليومية",
    upgrade: "الترقية",
    error: "حدث خطأ",
  },
  en: {
    title: "Dashboard",
    welcome: "Welcome",
    tokens: "Tokens",
    available: "Available",
    used: "Used",
    total: "Total",
    trial: "Free Trial",
    trialExpires: "Expires on",
    trialExpired: "Free trial expired",
    buyMore: "Buy Farms",
    farms: "Farms",
    noFarms: "No farms yet",
    noFarmsDesc: "Add your first farm to start automation",
    addFarm: "Add Farm",
    farmName: "Farm name",
    farmServer: "Server (optional)",
    farmNotes: "Notes (optional)",
    cancel: "Cancel",
    create: "Create",
    creating: "Creating...",
    deleteFarm: "Delete",
    deleteConfirm: "Are you sure you want to delete this farm?",
    tasks: "Tasks",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    server: "Server",
    created: "Created",
    noTokens: "No tokens available",
    noTokensDesc: "Subscribe first to add farms",
    loading: "Loading...",
    logout: "Logout",
    quickStats: "Quick Stats",
    activeFarms: "Active Farms",
    availableTokens: "Available Tokens",
    taskGroups: "Task Groups",
    resources: "Resources",
    combat: "Combat",
    alliance: "Alliance",
    daily: "Daily Tasks",
    upgrade: "Upgrades",
    error: "An error occurred",
  },
  ru: {
    title: "Панель управления",
    welcome: "Добро пожаловать",
    tokens: "Токены",
    available: "Доступно",
    used: "Использовано",
    total: "Всего",
    trial: "Пробный период",
    trialExpires: "Истекает",
    trialExpired: "Пробный период истек",
    buyMore: "Купить фермы",
    farms: "Фермы",
    noFarms: "Пока нет ферм",
    noFarmsDesc: "Добавьте первую ферму для автоматизации",
    addFarm: "Добавить ферму",
    farmName: "Название фермы",
    farmServer: "Сервер (необязательно)",
    farmNotes: "Заметки (необязательно)",
    cancel: "Отмена",
    create: "Создать",
    creating: "Создание...",
    deleteFarm: "Удалить",
    deleteConfirm: "Вы уверены, что хотите удалить эту ферму?",
    tasks: "Задачи",
    status: "Статус",
    active: "Активно",
    inactive: "Неактивно",
    server: "Сервер",
    created: "Создано",
    noTokens: "Нет доступных токенов",
    noTokensDesc: "Сначала оформите подписку",
    loading: "Загрузка...",
    logout: "Выйти",
    quickStats: "Статистика",
    activeFarms: "Активных ферм",
    availableTokens: "Доступных токенов",
    taskGroups: "Группы задач",
    resources: "Ресурсы",
    combat: "Бой",
    alliance: "Альянс",
    daily: "Ежедневные",
    upgrade: "Улучшения",
    error: "Произошла ошибка",
  },
  zh: {
    title: "控制面板",
    welcome: "欢迎",
    tokens: "代币",
    available: "可用",
    used: "已用",
    total: "总计",
    trial: "免费试用",
    trialExpires: "到期日",
    trialExpired: "免费试用已过期",
    buyMore: "购买农场",
    farms: "农场",
    noFarms: "暂无农场",
    noFarmsDesc: "添加您的第一个农场开始自动化",
    addFarm: "添加农场",
    farmName: "农场名称",
    farmServer: "服务器（可选）",
    farmNotes: "备注（可选）",
    cancel: "取消",
    create: "创建",
    creating: "创建中...",
    deleteFarm: "删除",
    deleteConfirm: "确定要删除此农场吗？",
    tasks: "任务",
    status: "状态",
    active: "活跃",
    inactive: "未激活",
    server: "服务器",
    created: "创建时间",
    noTokens: "没有可用代币",
    noTokensDesc: "请先订阅",
    loading: "加载中...",
    logout: "退出",
    quickStats: "快速统计",
    activeFarms: "活跃农场",
    availableTokens: "可用代币",
    taskGroups: "任务组",
    resources: "资源",
    combat: "战斗",
    alliance: "联盟",
    daily: "日常任务",
    upgrade: "升级",
    error: "发生错误",
  },
};

// =========== TASK DEFINITIONS ===========
const TASK_GROUPS = [
  {
    key: "resources",
    icon: "🌾",
    color: "#10b981",
    tasks: [
      "Gather Resources",
      "Collect Farms",
      "Open Chests",
      "Collect Free Items",
    ],
  },
  {
    key: "combat",
    icon: "⚔️",
    color: "#ef4444",
    tasks: [
      "Kill Monster",
      "Hunt Niflung",
      "Rally Niflung",
      "Auto Scout",
    ],
  },
  {
    key: "alliance",
    icon: "🏰",
    color: "#8b5cf6",
    tasks: [
      "Tribe Tech",
      "Tribe Gifts",
      "Alliance Help",
      "Send Gifts",
    ],
  },
  {
    key: "daily",
    icon: "📋",
    color: "#f59e0b",
    tasks: [
      "Mail Rewards",
      "Hall of Valor",
      "Prosperity",
      "Quest Rewards",
    ],
  },
  {
    key: "upgrade",
    icon: "🔨",
    color: "#3b82f6",
    tasks: [
      "Building Upgrade",
      "Troop Training",
      "Research Tech",
      "Heal Wounded",
    ],
  },
];

// =========== COMPONENT ===========
export default function DashboardClient() {
  const [lang, setLang] = useState<Lang>("ar");
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Token state
  const [tokens, setTokens] = useState<TokenInfo | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(true);

  // Farms state
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);

  // Add farm modal
  const [showAddFarm, setShowAddFarm] = useState(false);
  const [newFarmName, setNewFarmName] = useState("");
  const [newFarmServer, setNewFarmServer] = useState("");
  const [newFarmNotes, setNewFarmNotes] = useState("");
  const [addingFarm, setAddingFarm] = useState(false);
  const [farmError, setFarmError] = useState("");

  const s = tx[lang];
  const isRtl = lang === "ar";

  // Init
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vrbot_lang") as Lang;
      if (saved && tx[saved]) setLang(saved);
    } catch {}
    setMounted(true);
  }, []);

  // Load user
  useEffect(() => {
    if (!mounted) return;
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoadingUser(false);
    });
  }, [mounted]);

  // Load tokens
  const loadTokens = useCallback(async () => {
    setLoadingTokens(true);
    try {
      const res = await fetch("/api/tokens/status");
      if (res.ok) {
        const data = await res.json();

        // Auto-grant trial if no tokens
        if (data.tokens_total === 0 && !data.trial_granted) {
          const trialRes = await fetch("/api/tokens/grant-trial", {
            method: "POST",
          });
          if (trialRes.ok) {
            const res2 = await fetch("/api/tokens/status");
            if (res2.ok) {
              setTokens(await res2.json());
              setLoadingTokens(false);
              return;
            }
          }
        }
        setTokens(data);
      }
    } catch {}
    setLoadingTokens(false);
  }, []);

  // Load farms
  const loadFarms = useCallback(async () => {
    setLoadingFarms(true);
    try {
      const res = await fetch("/api/farms/list");
      if (res.ok) {
        const data = await res.json();
        setFarms(data.farms || []);
      }
    } catch {}
    setLoadingFarms(false);
  }, []);

  useEffect(() => {
    if (user) {
      loadTokens();
      loadFarms();
    }
  }, [user, loadTokens, loadFarms]);

  // Add farm
  async function handleAddFarm() {
    if (!newFarmName.trim()) return;
    setAddingFarm(true);
    setFarmError("");
    try {
      const res = await fetch("/api/farms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFarmName,
          server: newFarmServer || null,
          notes: newFarmNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFarmError(data.error || s.error);
      } else {
        setShowAddFarm(false);
        setNewFarmName("");
        setNewFarmServer("");
        setNewFarmNotes("");
        loadFarms();
        loadTokens();
      }
    } catch {
      setFarmError(s.error);
    }
    setAddingFarm(false);
  }

  if (!mounted || loadingUser) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16, animation: "spin 1s linear infinite" }}>🤖</div>
          <div style={{ color: "#64748b", fontSize: 15 }}>{s.loading}</div>
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  const daysLeft = tokens?.trial_expires_at
    ? Math.max(0, Math.ceil((new Date(tokens.trial_expires_at).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "#0b0f1a" }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>

      {/* ===== HEADER BAR ===== */}
      <div style={{
        background: "linear-gradient(135deg, #0f1629 0%, #1a1145 100%)",
        borderBottom: "1px solid rgba(139,92,246,0.15)",
        padding: "16px 28px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "0.5px" }}>
            🤖 {s.title}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
            {s.welcome}, {user.email?.split("@")[0]}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/billing" style={{
            padding: "8px 18px",
            background: "linear-gradient(135deg, #7c3aed, #6366f1)",
            color: "#fff",
            borderRadius: 10,
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 700,
          }}>
            {s.buyMore}
          </a>
          <a href="/auth/logout" style={{
            padding: "8px 14px",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.5)",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 600,
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            {s.logout}
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>
        {/* ===== TOKEN BAR ===== */}
        <div style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
          borderRadius: 16,
          padding: "20px 28px",
          marginBottom: 24,
          border: "1px solid rgba(139,92,246,0.25)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          animation: "fadeIn 0.4s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: "rgba(139,92,246,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26,
            }}>🎫</div>
            <div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600, marginBottom: 4 }}>
                {s.tokens}
              </div>
              <div style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: "#a78bfa" }}>
                  {loadingTokens ? "..." : tokens?.tokens_available ?? 0}
                </span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                  {s.available} / {tokens?.tokens_total ?? 0} {s.total}
                </span>
              </div>
            </div>
          </div>

          {/* Trial badge */}
          {tokens?.trial_granted && !tokens.trial_expired && (
            <div style={{
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: 10,
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>🎁</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#34d399" }}>{s.trial}</div>
                <div style={{ fontSize: 11, color: "rgba(52,211,153,0.7)" }}>
                  {daysLeft > 0 ? `${daysLeft} ${lang === "ar" ? "يوم" : "days"}` : s.trialExpired}
                </div>
              </div>
            </div>
          )}

          {tokens?.trial_expired && (
            <div style={{
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10,
              padding: "8px 16px",
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#f87171" }}>⚠️ {s.trialExpired}</span>
            </div>
          )}
        </div>

        {/* ===== QUICK STATS ===== */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}>
          {[
            { label: s.activeFarms, value: farms.length, icon: "🌾", color: "#10b981" },
            { label: s.availableTokens, value: tokens?.tokens_available ?? 0, icon: "🎫", color: "#a78bfa" },
            { label: s.used, value: tokens?.tokens_used ?? 0, icon: "📊", color: "#f59e0b" },
          ].map((stat, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.03)",
              borderRadius: 14,
              padding: "18px 20px",
              border: "1px solid rgba(255,255,255,0.06)",
              animation: `fadeIn ${0.3 + i * 0.1}s ease`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{stat.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: stat.color, marginTop: 4 }}>{stat.value}</div>
                </div>
                <div style={{ fontSize: 28, opacity: 0.4 }}>{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ===== FARMS SECTION ===== */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>
            🌾 {s.farms} ({farms.length})
          </h2>
          <button onClick={() => {
            if (tokens && tokens.tokens_available > 0) {
              setShowAddFarm(true);
              setFarmError("");
            }
          }} style={{
            padding: "8px 20px",
            background: tokens && tokens.tokens_available > 0
              ? "linear-gradient(135deg, #10b981, #059669)"
              : "rgba(255,255,255,0.06)",
            color: tokens && tokens.tokens_available > 0 ? "#fff" : "rgba(255,255,255,0.3)",
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: tokens && tokens.tokens_available > 0 ? "pointer" : "not-allowed",
          }}>
            + {s.addFarm}
          </button>
        </div>

        {loadingFarms ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ color: "rgba(255,255,255,0.3)" }}>{s.loading}</div>
          </div>
        ) : farms.length === 0 ? (
          <div style={{
            background: "rgba(255,255,255,0.02)",
            borderRadius: 16,
            padding: "48px 24px",
            textAlign: "center",
            border: "1px dashed rgba(255,255,255,0.08)",
            animation: "fadeIn 0.5s ease",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🌾</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{s.noFarms}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>{s.noFarmsDesc}</div>
            {tokens && tokens.tokens_available > 0 && (
              <button onClick={() => setShowAddFarm(true)} style={{
                marginTop: 16,
                padding: "10px 24px",
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}>
                + {s.addFarm}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {farms.map((farm, i) => (
              <div key={farm.id} style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: 14,
                padding: "20px",
                border: "1px solid rgba(255,255,255,0.06)",
                animation: `fadeIn ${0.3 + i * 0.08}s ease`,
                transition: "border-color 0.2s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
              >
                {/* Farm header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: "rgba(16,185,129,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20,
                    }}>🌾</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{farm.name}</div>
                      {farm.server && (
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                          {s.server}: {farm.server}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "rgba(16,185,129,0.15)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#34d399",
                  }}>
                    {s.active}
                  </div>
                </div>

                {/* Task groups mini */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {TASK_GROUPS.map((g) => (
                    <div key={g.key} style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: `${g.color}15`,
                      fontSize: 11,
                      color: g.color,
                      fontWeight: 600,
                    }}>
                      {g.icon} {g.tasks.length}
                    </div>
                  ))}
                </div>

                {/* Farm footer */}
                <div style={{
                  paddingTop: 10,
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
                    {s.created}: {new Date(farm.created_at).toLocaleDateString()}
                  </div>
                  {farm.notes && (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>
                      {farm.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== TASK GROUPS OVERVIEW ===== */}
        <h2 style={{ margin: "28px 0 14px", fontSize: 18, fontWeight: 700, color: "#fff" }}>
          📋 {s.taskGroups}
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
        }}>
          {TASK_GROUPS.map((group, i) => (
            <div key={group.key} style={{
              background: "rgba(255,255,255,0.02)",
              borderRadius: 12,
              padding: "16px",
              border: `1px solid ${group.color}20`,
              animation: `fadeIn ${0.4 + i * 0.08}s ease`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>{group.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: group.color }}>
                  {s[group.key as keyof typeof s] || group.key}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {group.tasks.map((task) => (
                  <div key={task} style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.4)",
                    padding: "3px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "rgba(255,255,255,0.15)",
                      flexShrink: 0,
                    }}></span>
                    {task}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== ADD FARM MODAL ===== */}
      {showAddFarm && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 20,
        }} onClick={() => setShowAddFarm(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#1a1f2e",
            borderRadius: 18,
            padding: "28px",
            width: "100%",
            maxWidth: 420,
            border: "1px solid rgba(139,92,246,0.2)",
            animation: "fadeIn 0.25s ease",
          }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#fff" }}>
              🌾 {s.addFarm}
            </h3>

            <div style={{ display: "grid", gap: 12 }}>
              <input
                placeholder={s.farmName}
                value={newFarmName}
                onChange={(e) => setNewFarmName(e.target.value)}
                autoFocus
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <input
                placeholder={s.farmServer}
                value={newFarmServer}
                onChange={(e) => setNewFarmServer(e.target.value)}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <input
                placeholder={s.farmNotes}
                value={newFarmNotes}
                onChange={(e) => setNewFarmNotes(e.target.value)}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                }}
              />

              {farmError && (
                <div style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171",
                  fontSize: 13,
                }}>
                  {farmError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowAddFarm(false)} style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}>
                  {s.cancel}
                </button>
                <button
                  onClick={handleAddFarm}
                  disabled={addingFarm || !newFarmName.trim()}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 10,
                    border: "none",
                    background: addingFarm
                      ? "rgba(139,92,246,0.3)"
                      : "linear-gradient(135deg, #7c3aed, #6366f1)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: addingFarm ? "not-allowed" : "pointer",
                  }}
                >
                  {addingFarm ? s.creating : s.create}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
