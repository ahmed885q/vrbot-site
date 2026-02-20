// app/admin/licenses/page.tsx
import { supabaseService } from "../../../lib/supabase/server";

export default async function AdminLicensesPage() {
  const svc = supabaseService();

  const { data, error } = await svc
    .from("v_admin_license_keys")
    .select("key,plan_id,usage_status,created_at,used_at,used_by")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Licenses</h1>
        <pre>{String(error.message)}</pre>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>License Keys</h1>
      <p style={{ color: "#666" }}>Used / Unused overview</p>

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {(data || []).map((k) => (
          <div
            key={k.key}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 14,
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800 }}>{k.key}</div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  Plan: <b>{k.plan_id}</b> • Created: {new Date(k.created_at).toLocaleString()}
                </div>
              </div>

              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
                  border: "1px solid #ddd",
                  background: k.usage_status === "used" ? "#ecfdf5" : "#f9fafb",
                  color: k.usage_status === "used" ? "#047857" : "#374151",
                  height: "fit-content",
                }}
              >
                {k.usage_status.toUpperCase()}
              </span>
            </div>

            {k.usage_status === "used" && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#444" }}>
                Used At: {k.used_at ? new Date(k.used_at).toLocaleString() : "—"} <br />
                Used By: {k.used_by || "—"}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
