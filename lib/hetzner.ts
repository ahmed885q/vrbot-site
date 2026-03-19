const BASE_URL = process.env.ORCHESTRATOR_URL || "https://cloud.vrbot.me";
const API_KEY  = process.env.VRBOT_API_KEY    || "vrbot_admin_2026";
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xmanyfpojzkjlwatkrcc.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || "";

async function getAssignedContainers(): Promise<Set<string>> {
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/cloud_farms?select=container_id&status=neq.deleted&container_id=not.is.null`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    );
    if (!res.ok) return new Set();
    const data = await res.json();
    const normalize = (id: string) => id?.replace(/\D/g, "").padStart(3, "0") || "";
    return new Set((data || []).map((f: any) => normalize(f.container_id || "")));
  } catch { return new Set(); }
}

export async function getAvailableContainer(): Promise<string | null> {
  try {
    const [hetznerRes, assignedSet] = await Promise.all([
      fetch(`${BASE_URL}/api/farms/status`, {
        headers: { "X-API-Key": API_KEY },
        signal: AbortSignal.timeout(8000),
      }),
      getAssignedContainers(),
    ]);
    if (!hetznerRes.ok) return null;
    const d = await hetznerRes.json();
    const farms: any[] = d.farms || [];
    const normalize = (id: string) => id?.replace(/\D/g, "").padStart(3, "0") || "";
    const sorted = [...farms].sort((a, b) =>
      parseInt(normalize(a.farm_id?.toString() || "0")) -
      parseInt(normalize(b.farm_id?.toString() || "0"))
    );
    for (const farm of sorted) {
      if (farm.live_status !== "idle" || farm.game_pid) continue;
      const normId = normalize(farm.farm_id?.toString() || "");
      if (!assignedSet.has(normId)) return `farm_${normId}`;
    }
    return null;
  } catch (e) {
    console.error("[getAvailableContainer]", e);
    return null;
  }
}

export async function loginFarm(params: {
  container_id: string;
  nickname: string;
  igg_email: string;
  igg_password: string;
  user_id: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/farms/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify({
        farm_id: params.container_id,
        nickname: params.nickname,
        igg_email: params.igg_email,
        igg_password: params.igg_password,
        user_id: params.user_id,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: data.ok || data.success, error: data.error };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}

export async function getFarmStatus(container_id: string): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/api/farms/status`, {
      headers: { "X-API-Key": API_KEY },
      signal: AbortSignal.timeout(5000),
    });
    const d = await res.json();
    const normalize = (id: string) => id?.replace(/\D/g, "").padStart(3, "0") || "";
    return (d.farms || []).find(
      (f: any) => normalize(f.farm_id?.toString() || "") === normalize(container_id)
    ) || null;
  } catch { return null; }
}
