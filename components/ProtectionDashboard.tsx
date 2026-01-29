"use client";

import { useEffect, useMemo, useState } from "react";

type Incident = {
  id: number;
  incident_type: string;
  severity: string | null;
  created_at: string | null;
  resolved: boolean | null;
};

type Setting = {
  id: number;
  setting_key: string;
  setting_value: string | null;
  value_type: string | null;
  category: string | null;
  updated_at: string | null;
};

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data;
}

export default function ProtectionDashboard() {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyToggle, setBusyToggle] = useState(false);

  const systemEnabled = useMemo(() => {
    const s = settings.find((x) => x.setting_key === "system_enabled");
    return String(s?.setting_value).toLowerCase() === "true";
  }, [settings]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [i, s] = await Promise.all([
        fetchJSON<{ data: Incident[] }>("/api/protection/incidents"),
        fetchJSON<{ data: Setting[] }>("/api/protection/settings"),
      ]);
      setIncidents(i.data || []);
      setSettings(s.data || []);
    } catch (e: any) {
      setError(e?.message || "حدث خطأ غير معروف");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function toggleSystem() {
    setBusyToggle(true);
    setError(null);
    try {
      await fetchJSON("/api/protection/toggle", { method: "POST" });
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "فشل التفعيل/التعطيل");
    } finally {
      setBusyToggle(false);
    }
  }

  async function markResolved(id: number, resolved: boolean) {
    setError(null);
    try {
      await fetchJSON("/api/protection/incidents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resolved }),
      });
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "فشل تحديث الحالة");
    }
  }

  if (loading) return <div>جارٍ التحميل...</div>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {error ? (
        <div style={{ padding: 12, border: "1px solid #ffb3b3", borderRadius: 10 }}>
          <b style={{ color: "#b00020" }}>خطأ:</b> {error}
        </div>
      ) : null}

      {/* Toggle */}
      <div style={{ padding: 16, border: "1px solid #e5e5e5", borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>تشغيل النظام</div>
            <div style={{ opacity: 0.8, marginTop: 4 }}>
              الحالة الحالية:{" "}
              <b style={{ color: systemEnabled ? "green" : "crimson" }}>
                {systemEnabled ? "مفعّل" : "موقّف"}
              </b>
            </div>
          </div>

          <button
            onClick={toggleSystem}
            disabled={busyToggle}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              cursor: busyToggle ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {busyToggle ? "جارٍ التنفيذ..." : systemEnabled ? "تعطيل" : "تفعيل"}
          </button>
        </div>
      </div>

      {/* Settings */}
      <div style={{ padding: 16, border: "1px solid #e5e5e5", borderRadius: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>الإعدادات</div>
        <div style={{ opacity: 0.8, marginTop: 6 }}>anti_detection_settings</div>

        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["key", "value", "type", "category", "updated"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {settings.map((s) => (
                <tr key={s.id}>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>{s.setting_key}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>{String(s.setting_value ?? "")}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>{s.value_type ?? ""}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>{s.category ?? ""}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>
                    {s.updated_at ? new Date(s.updated_at).toLocaleString() : ""}
                  </td>
                </tr>
              ))}
              {settings.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 10, opacity: 0.7 }}>
                    لا توجد إعدادات.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incidents */}
      <div style={{ padding: 16, border: "1px solid #e5e5e5", borderRadius: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>الحوادث</div>
        <div style={{ opacity: 0.8, marginTop: 6 }}>detection_incidents</div>

        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["id", "type", "severity", "created", "resolved", "action"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.map((x) => (
                <tr key={x.id}>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>{x.id}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>{x.incident_type}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>{x.severity ?? ""}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>
                    {x.created_at ? new Date(x.created_at).toLocaleString() : ""}
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>
                    {x.resolved ? "✅" : "❌"}
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>
                    <button
                      onClick={() => markResolved(x.id, !x.resolved)}
                      style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #ddd", cursor: "pointer" }}
                    >
                      {x.resolved ? "إلغاء" : "حل"}
                    </button>
                  </td>
                </tr>
              ))}
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 10, opacity: 0.7 }}>
                    لا توجد حوادث.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <button onClick={loadAll} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd" }}>
        تحديث البيانات
      </button>
    </div>
  );
}
