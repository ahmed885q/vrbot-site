const BASE_URL = process.env.ORCHESTRATOR_URL || "https://cloud.vrbot.me";
const API_KEY  = process.env.VRBOT_API_KEY    || "vrbot_admin_2026";

// normalize farm_id: "1", "001", "farm_001" → "001"
function normId(id: string): string {
  return (id || "").replace(/\D/g, "").padStart(3, "0");
}

/**
 * يرجع أول container idle من Hetzner بعد استبعاد المحجوزة
 * @param assignedContainerIds قائمة container_ids المحجوزة من Supabase
 */
export async function getAvailableContainer(
  assignedContainerIds: string[] = []
): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/farms/status`, {
      headers: { "X-API-Key": API_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const farms: any[] = d.farms || [];

    const assignedSet = new Set(assignedContainerIds.map(normId));

    // رتّب تصاعدياً واختر أول idle غير محجوز
    const sorted = [...farms].sort(
      (a, b) => parseInt(normId(a.farm_id?.toString() || "0")) - parseInt(normId(b.farm_id?.toString() || "0"))
    );

    for (const farm of sorted) {
      if (farm.live_status !== "idle" || farm.game_pid) continue;
      const n = normId(farm.farm_id?.toString() || "");
      if (!assignedSet.has(n)) return `farm_${n}`;
    }

    return null;
  } catch (e) {
    console.error("[hetzner] getAvailableContainer:", e);
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
        farm_id:      params.container_id,
        nickname:     params.nickname,
        igg_email:    params.igg_email,
        igg_password: params.igg_password,
        user_id:      params.user_id,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: !!(data.ok || data.success), error: data.error };
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
    return (d.farms || []).find(
      (f: any) => normId(f.farm_id?.toString() || "") === normId(container_id)
    ) || null;
  } catch { return null; }
}
