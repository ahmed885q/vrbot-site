export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════
// ADB COMMAND SAFETY — whitelist for exec: commands
// ═══════════════════════════════════════════════════════════════
// Commands prefixed with "exec:" are translated to "shell:<cmd>"
// and sent to the Hetzner ADB backend. Only whitelisted prefixes
// are allowed to prevent dangerous operations.
// ═══════════════════════════════════════════════════════════════

const EXEC_WHITELIST = [
  // Package management (read-only)
  "pm list packages",
  "pm path ",
  "pm dump ",
  // Activity / window inspection
  "dumpsys activity top",
  "dumpsys activity activities",
  "dumpsys window",
  "dumpsys display",
  "dumpsys meminfo",
  // App launch
  "monkey -p ",
  "am start ",
  "am start-activity ",
  "am force-stop ",
  // Input (tap, swipe, key, text)
  "input tap ",
  "input swipe ",
  "input keyevent ",
  "input text ",
  // Screenshot / screen state
  "screencap ",
  "wm size",
  "wm density",
  // Process info
  "ps ",
  "ps -",
  "getprop ",
  // Logging (read-only)
  "logcat -t ",
  "logcat -d ",
  // Settings (read)
  "settings get ",
  "settings list ",
];

/** Check if an exec command is safe (matches whitelist) */
function isExecAllowed(cmd: string): boolean {
  const trimmed = cmd.trim();
  return EXEC_WHITELIST.some(
    (prefix) => trimmed === prefix.trim() || trimmed.startsWith(prefix)
  );
}

/** Dangerous patterns that should NEVER be allowed */
const EXEC_BLOCKLIST = [
  "rm ",
  "rm -",
  "mkfs",
  "dd ",
  "reboot",
  "shutdown",
  "su ",
  "su\n",
  "chmod ",
  "chown ",
  "mount ",
  "umount ",
  "format",
  "flash",
  "fastboot",
  "install ",
  "pm install",
  "pm uninstall",
  "pm clear",
  "pm disable",
  "pm enable",
  "pm grant",
  "pm revoke",
  "settings put ",
  "settings delete ",
  "wipe",
  "factory",
];

function isExecBlocked(cmd: string): boolean {
  const trimmed = cmd.trim().toLowerCase();
  return EXEC_BLOCKLIST.some(
    (pattern) => trimmed === pattern.trim() || trimmed.startsWith(pattern)
  );
}

/**
 * Validate command for the Hetzner ADB backend.
 *
 * Supported formats (all passed through to backend as-is):
 *   - "exec:<cmd>"  → validated via whitelist, then forwarded to backend
 *   - "shell:<cmd>" → legacy compat, forwarded as-is
 *   - "tap:x,y"     → forwarded as-is
 *   - "key:NAME"    → forwarded as-is
 *   - "swipe:..."   → forwarded as-is
 *   - "text:..."    → forwarded as-is
 *
 * Returns { command, error } — if error is set, the command was rejected.
 */
function resolveCommand(raw: string): { command: string; error?: string } {
  // ── exec: prefix → validate whitelist, pass through to backend ──
  if (raw.startsWith("exec:")) {
    const inner = raw.slice(5).trim();
    if (!inner) {
      return { command: "", error: "exec command is empty" };
    }
    if (isExecBlocked(inner)) {
      return { command: "", error: `blocked command: ${inner.slice(0, 40)}` };
    }
    if (!isExecAllowed(inner)) {
      return {
        command: "",
        error: `command not whitelisted: ${inner.slice(0, 40)}`,
      };
    }
    // Pass exec: through — backend handles it natively now
    return { command: raw };
  }

  // ── All other prefixes pass through as-is ──────────────────
  // shell:, tap:, key:, swipe:, text: — forwarded directly to backend
  return { command: raw };
}

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════

async function getUser(req: Request) {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (token && token !== "undefined") {
    const { data } = await service.auth.getUser(token);
    if (data?.user) return { user: data.user, service };
  }
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data } = await supabase.auth.getUser();
    if (data?.user) return { user: data.user, service };
  } catch {}
  return null;
}

// ═══════════════════════════════════════════════════════════════
// POST /api/farms/adb
// ═══════════════════════════════════════════════════════════════

export async function POST(req: Request) {
  try {
    const auth = await getUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { farm_id, command: rawCommand, action_id } = body;
    if (!farm_id || !rawCommand)
      return NextResponse.json({ error: "farm_id and command required" }, { status: 400 });

    // ── Resolve exec: commands ────────────────────────────────
    const { command, error: cmdError } = resolveCommand(rawCommand);
    if (cmdError) {
      return NextResponse.json(
        { ok: false, error: cmdError, _command: rawCommand },
        { status: 403 }
      );
    }

    // ── Server-side idempotency guard (Redis SET NX EX) ────────────
    const { checkIdempotency, resolveAction } = await import("@/lib/idempotency");
    const { serverTimestamp } = await import("@/lib/redis");
    const idemResult = await checkIdempotency(action_id);
    if (!idemResult.allowed) {
      return NextResponse.json({
        ok: false,
        error: "duplicate_action",
        action_id,
        message: `Action ${action_id} already processed (${(idemResult as any).originalStatus})`,
        _server_ts: serverTimestamp(),
      }, { status: 409 });
    }

    const HETZNER = process.env.HETZNER_IP || "cloud.vrbot.me";
    const API_KEY = process.env.VRBOT_API_KEY || "vrbot_admin_2026";
    const res = await fetch(`https://${HETZNER}/api/farms/adb`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify({ farm_id, command }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && data.ok;

    // ── Resolve server-side two-phase commit ──────────────────────
    await resolveAction(action_id, ok ? "executed" : "failed");

    return NextResponse.json({
      ok,
      action_id,
      _server_ts: serverTimestamp(),
      _resolved_command: command, // show what was actually sent to backend
      ...data,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
