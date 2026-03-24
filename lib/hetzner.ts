import { withCircuitBreaker } from "@/lib/circuit-breaker";

const BASE_URL = process.env.ORCHESTRATOR_URL;
const API_KEY  = process.env.VRBOT_API_KEY;

if (!BASE_URL) throw new Error("[hetzner] ORCHESTRATOR_URL environment variable is required");
if (!API_KEY)  throw new Error("[hetzner] VRBOT_API_KEY environment variable is required");

// ── Circuit-breaker-protected fetch for Hetzner ──────────────────────────
export async function hetznerFetch(path: string, options?: RequestInit): Promise<Response> {
  return withCircuitBreaker(
    "hetzner",
    async () => {
      const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
          "X-API-Key": API_KEY || "",
          "Content-Type": "application/json",
          ...options?.headers,
        },
        signal: options?.signal || AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Hetzner ${path}: HTTP ${res.status}`);
      return res;
    }
  );
}

function normId(id: string): string {
  return (id || "").replace(/\D/g, "").padStart(3, "0");
}

// ── Smart Container Allocator ──────────────────────────────────────────────
export async function getAvailableContainer(
  assignedContainerIds: string[] = []
): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/farms/status/live`, {
      headers: { "X-API-Key": API_KEY || "" },
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
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY || "" },
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
  action?: string; // FIX: أضف action — يدعم "stop" | "status" | "start"
}): Promise<{ ok: boolean; result?: any; error?: string }> {
  try {
    // FIX: بناء الـ command بناءً على action
    let command: string;
    if (params.action === "stop") {
      command = "stop";
    } else if (params.action === "status") {
      command = "status";
    } else if (params.tasks && params.tasks.length > 0) {
      command = `run_tasks:${params.tasks.join(",")}`;
    } else {
      command = "status";
    }

    // FIX: تأكد أن farm_id دائماً بصيغة "farm_001"
    const raw = (params.container_id || "").replace(/\D/g, "").padStart(3, "0");
    const farm_id = params.container_id.startsWith("farm_")
      ? params.container_id
      : `farm_${raw}`;

    const res = await fetch(`${BASE_URL}/api/farms/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY || "" },
      body: JSON.stringify({ farm_id, command, user_id: params.user_id }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: !!(data.ok || data.success), result: data, error: data.error };
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
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY || "" },
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
    const res = await fetch(`${BASE_URL}/api/farms/status/live`, {
      headers: { "X-API-Key": API_KEY || "" },
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
