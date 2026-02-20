"use client";

import LocalStreamControls from "@/components/LocalStreamControls";

export default function LocalStreamPage() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>VR Farm Manager</h1>
        <a
          href="/dashboard"
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #ccc",
            background: "#fff",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          Back to Dashboard
        </a>
      </div>

      <div style={{ marginTop: 16 }}>
        <LocalStreamControls />
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
