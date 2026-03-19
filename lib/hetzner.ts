const BASE_URL = process.env.ORCHESTRATOR_URL || "https://cloud.vrbot.me";
const API_KEY  = process.env.VRBOT_API_KEY    || "vrbot_admin_2026";

function normId(id: string): string {
  return (id || "").replace(/\D/g, "").padStart(3, "0");
}

// ── Smart Container Allocator ──────────────────────────────────────────────
export async function getAvailableContainer(
  assignedContainerIds: string[] = []
): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/farms/status`, {
      headers: { "X-API-Key": API_KEY },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error("[hetzner] farms/status:", res.status);
      return null;
    }
    const d = await res.json();
    const farms: any[] = d.farms || [];
    const assignedSet = new Set(assignedContainerIds.map(normId).filter(Boolean));

    console.log("[hetzner] total farms:", farms.length, "assigned:", [...assignedSet]);

    const sorted = [...farms].sort(
      (a, b) =>
        parseInt(normId(a.farm_id?.toString() || "0")) -
        parseInt(normId(b.farm_id?.toString() || "0"))
    );

    for (const farm of sorted) {
      const status = farm.live_status || farm.status || "";
      if (status !== "idle") continue;
      if (farm.game_pid) continue;
      const n = normId(farm.farm_id?.toString() || "");
      if (!assignedSet.has(n)) {
        console.log("[hetzner] selected container:", n);
        return `farm_${n}`;
      }
    }

    console.log("[hetzner] no available container found");
    return null;
  } catch (e) {
    console.error("[hetzner] getAvailableContainer error:", e);
    return null;
  }
}

// ── Login Farm ─────────────────────────────────────────────────────────────
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

// ── Run Farm Tasks ─────────────────────────────────────────────────────────
export async function runFarmTasks(params: {
  container_id: string;
  tasks: string[];
  user_id: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/farms/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify({
        farm_id: params.container_id,
        command: `run_tasks:${params.tasks.join(",")}`,
        user_id: params.user_id,
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

// ── Transfer Resources ─────────────────────────────────────────────────────
export async function transferResources(params: {
  from_container: string;
  to_container: string;
  resources: string[];
  amount?: number;
  user_id: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/farms/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify({
        from_farm_id: params.from_container,
        to_farm_id:   params.to_container,
        resources:    params.resources,
        amount:       params.amount,
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

// ── Get Farm Status ────────────────────────────────────────────────────────
export async function getFarmStatus(container_id: string): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/api/farms/status`, {
      headers: { "X-API-Key": API_KEY },
      signal: AbortSignal.timeout(5000),
    });
    const d = await res.json();
    return (
      (d.farms || []).find(
        (f: any) => normId(f.farm_id?.toString() || "") === normId(container_id)
      ) || null
    );
  } catch {
    return null;
  }
}
