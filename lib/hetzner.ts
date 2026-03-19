/**
 * Hetzner Farm Controller Helper
 * يُرسل الأوامر لـ Hetzner بـ container_id الصحيح
 */

const HETZNER_IP   = process.env.HETZNER_IP    || "88.99.64.19";
const HETZNER_PORT = process.env.HETZNER_PORT  || "8888";
const API_KEY      = process.env.VRBOT_API_KEY || "vrbot_admin_2026";
const BASE_URL = `https://${HETZNER_IP}`;

// جلب قائمة الـ containers المتاحة من Hetzner
export async function getAvailableContainer(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/farms/status`, {
      headers: { "X-API-Key": API_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const farms: any[] = d.farms || [];

    // ابحث عن container فارغ (idle + بدون game_pid)
    const idle = farms.find(
      (f: any) => f.live_status === "idle" && !f.game_pid
    );
    return idle?.farm_id || null;
  } catch {
    return null;
  }
}

// تسجيل دخول IGG على container محدد
export async function loginFarm(params: {
  container_id: string;
  nickname:     string;
  igg_email:    string;
  igg_password: string;
  user_id:      string;
}): Promise<{ ok: boolean; error?: string; android_id?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/farms/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({
        farm_id:      params.container_id,
        nickname:     params.nickname,
        igg_email:    params.igg_email,
        igg_password: params.igg_password,
        user_id:      params.user_id,
      }),
      signal: AbortSignal.timeout(60000), // 60 ثانية للـ login
    });
    const d = await res.json().catch(() => ({}));
    return { ok: res.ok, error: d.detail || d.error, android_id: d.android_id };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}

// إرسال أمر تشغيل مهام
export async function runFarmTasks(params: {
  container_id: string;
  tasks:        string[];
  action?:      string;
}): Promise<{ ok: boolean; result?: any; error?: string }> {
  try {
    const endpoint = params.action === "stop"
      ? "/api/farms/stop"
      : "/api/farms/command";

    const body = params.action === "stop"
      ? { farm_id: params.container_id }
      : { farm_id: params.container_id, command: `run_tasks:${params.tasks.join(",")}` };

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const result = await res.json().catch(() => ({ ok: res.ok }));
    return { ok: res.ok, result };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}

// إرسال أمر نقل موارد
export async function transferResources(params: {
  container_id: string;
  command:      string;
  task_config:  any;
}): Promise<{ ok: boolean; result?: any; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/farms/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({
        farm_id:     params.container_id,
        command:     params.command,
        task_config: params.task_config,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await res.json().catch(() => ({ ok: res.ok }));
    return { ok: res.ok, result };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}

// جلب حالة container محدد
export async function getFarmStatus(container_id: string): Promise<any | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/farms/status`, {
      headers: { "X-API-Key": API_KEY },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return (d.farms || []).find((f: any) => f.farm_id === container_id) || null;
  } catch {
    return null;
  }
}

