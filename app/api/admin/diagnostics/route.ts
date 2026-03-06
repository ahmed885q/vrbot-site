export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function isAdminEmail(email: string | null | undefined) {
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return email ? admins.includes(email.toLowerCase()) : false;
}
function getDB() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }); }
function getAuth() {
  const cookieStore = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
}
async function checkAdmin() {
  const s = getAuth(); const { data } = await s.auth.getUser();
  return data?.user && isAdminEmail(data.user.email) ? data.user : null;
}

export async function GET() {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDB();
  let hubHealth: any = null;
  try { const r = await fetch(process.env.WS_HUB_HEALTH_URL || "http://65.109.213.9:8787/health", { signal: AbortSignal.timeout(5000) }); hubHealth = await r.json(); } catch (e: any) { hubHealth = { error: e.message, status: "offline" }; }
  const [farmsRes, tokensRes, subsRes, keysRes, settingsRes, usersRes] = await Promise.all([
    db.from("user_farms").select("id, user_id, name, server, bot_enabled, bot_status, created_at, last_bot_activity"),
    db.from("tokens").select("user_id, tokens_total, tokens_used, trial_granted, trial_expires_at, updated_at"),
    db.from("subscriptions").select("id, user_id, plan, status, current_period_end, stripe_customer_id, pro_key_code, updated_at"),
    db.from("pro_keys").select("id, code, is_used, used_by, used_at, created_at, created_by, revoked_at, revoked_by, batch_tag, note, delivered_at, delivered_by, delivered_to, delivered_note").order("created_at", { ascending: false }),
    db.from("anti_detection_settings").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const users = usersRes.data?.users?.map((u: any) => ({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in: u.last_sign_in_at, banned: u.banned_until ? true : false })) ?? [];
  const userMap: Record<string, string> = {}; users.forEach((u: any) => { userMap[u.id] = u.email; });
  const farms = farmsRes.data ?? []; const tokens = tokensRes.data ?? []; const subs = subsRes.data ?? []; const keys = keysRes.data ?? [];
  return NextResponse.json({
    ok: true, timestamp: new Date().toISOString(), hub: hubHealth,
    stats: { totalUsers: users.length, totalFarms: farms.length, activeFarms: farms.filter((f: any) => f.bot_enabled).length, activeSubs: subs.filter((s: any) => s.status === "active").length, totalTokensUsed: tokens.reduce((a: number, t: any) => a + (t.tokens_used || 0), 0), totalTokensAvail: tokens.reduce((a: number, t: any) => a + (t.tokens_total || 0), 0), totalKeys: keys.length, usedKeys: keys.filter((k: any) => k.is_used).length, revokedKeys: keys.filter((k: any) => k.revoked_at).length, deliveredKeys: keys.filter((k: any) => k.delivered_at).length },
    farms: farms.map((f: any) => ({ ...f, email: userMap[f.user_id] || f.user_id })),
    tokens: tokens.map((t: any) => ({ ...t, email: userMap[t.user_id] || t.user_id })),
    subscriptions: subs.map((s: any) => ({ ...s, email: userMap[s.user_id] || s.user_id })),
    proKeys: keys.map((k: any) => ({ ...k, usedByEmail: k.used_by ? (userMap[k.used_by] || k.used_by) : null, revoked: !!k.revoked_at })),
    antiDetection: settingsRes.data ?? null, users,
    errors: { farms: farmsRes.error?.message ?? null, tokens: tokensRes.error?.message ?? null, subs: subsRes.error?.message ?? null, keys: keysRes.error?.message ?? null },
  });
}

export async function POST(req: Request) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDB();
  const body = await req.json().catch(() => ({}));
  const { action, userId, farmId, keyId, count, batchTag, note, email, password, settings, keyIds, deliveredTo, deliveredNote } = body;
  switch (action) {
    case "reset_tokens": {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const { error } = await db.from("tokens").update({ tokens_used: 0, updated_at: new Date().toISOString() }).eq("user_id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Tokens reset" });
    }
    case "disable_farm": {
      if (!farmId) return NextResponse.json({ error: "farmId required" }, { status: 400 });
      const { error } = await db.from("user_farms").update({ bot_enabled: false, bot_status: "disabled_by_admin" }).eq("id", farmId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Farm disabled" });
    }
    case "enable_farm": {
      if (!farmId) return NextResponse.json({ error: "farmId required" }, { status: 400 });
      const { error } = await db.from("user_farms").update({ bot_enabled: true, bot_status: "idle" }).eq("id", farmId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Farm enabled" });
    }
    case "cancel_subscription":
    case "deactivate_subscription": {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const { error } = await db.from("subscriptions").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("user_id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Subscription deactivated" });
    }
    case "activate_subscription": {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const endDate = new Date(); endDate.setMonth(endDate.getMonth() + 1);
      const { data: existingSub } = await db.from("subscriptions").select("id").eq("user_id", userId).single();
      if (existingSub) {
        const { error } = await db.from("subscriptions").update({ status: "active", plan: "pro", current_period_end: endDate.toISOString(), stripe_customer_id: "admin_manual", updated_at: new Date().toISOString() }).eq("user_id", userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        const { error } = await db.from("subscriptions").insert({ user_id: userId, plan: "pro", status: "active", current_period_end: endDate.toISOString(), stripe_customer_id: "admin_manual" });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, message: "Activated for 30 days" });
    }
    case "delete_farm": {
      if (!farmId) return NextResponse.json({ error: "farmId required" }, { status: 400 });
      const { data: farm } = await db.from("user_farms").select("user_id").eq("id", farmId).single();
      await db.from("farm_settings").delete().eq("farm_id", farmId);
      const { error } = await db.from("user_farms").delete().eq("id", farmId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (farm?.user_id) await db.rpc("refund_token", { p_user_id: farm.user_id });
      return NextResponse.json({ ok: true, message: "Farm deleted + token refunded" });
    }
    case "generate_keys": {
      const n = Math.min(Math.max(Number(count || 1), 1), 100);
      const tag = batchTag ? String(batchTag).trim().slice(0, 64) : null;
      const nt = note ? String(note).trim().slice(0, 160) : null;
      const rows = Array.from({ length: n }, () => ({ code: crypto.randomBytes(16).toString("hex").toUpperCase(), created_by: user.id, batch_tag: tag, note: nt }));
      const { error } = await db.from("pro_keys").insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: n + " keys generated", codes: rows.map(r => r.code) });
    }
    case "deliver_keys": {
      if (!keyIds?.length || !deliveredTo) return NextResponse.json({ error: "keyIds + deliveredTo required" }, { status: 400 });
      const { error } = await db.from("pro_keys").update({ delivered_at: new Date().toISOString(), delivered_by: user.id, delivered_to: deliveredTo, delivered_note: deliveredNote || null }).in("id", keyIds);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: keyIds.length + " keys delivered to " + deliveredTo });
    }
    case "revoke_key": {
      if (!keyId) return NextResponse.json({ error: "keyId required" }, { status: 400 });
      const { error } = await db.from("pro_keys").update({ revoked_at: new Date().toISOString(), revoked_by: user.id }).eq("id", keyId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Key revoked" });
    }
    case "unrevoke_key": {
      if (!keyId) return NextResponse.json({ error: "keyId required" }, { status: 400 });
      const { error } = await db.from("pro_keys").update({ revoked_at: null, revoked_by: null }).eq("id", keyId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Key unrevoked" });
    }
    case "delete_user": {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      await db.from("farm_settings").delete().eq("farm_id", userId);
      await db.from("user_farms").delete().eq("user_id", userId);
      await db.from("tokens").delete().eq("user_id", userId);
      await db.from("subscriptions").delete().eq("user_id", userId);
      const { error } = await db.auth.admin.deleteUser(userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "User deleted" });
    }
    case "ban_user": {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const { error } = await db.auth.admin.updateUserById(userId, { ban_duration: "876600h" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "User banned" });
    }
    case "unban_user": {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const { error } = await db.auth.admin.updateUserById(userId, { ban_duration: "none" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "User unbanned" });
    }
    case "create_user": {
      if (!email || !password) return NextResponse.json({ error: "email + password required" }, { status: 400 });
      const { error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "User created: " + email });
    }
    case "save_protection": {
      if (!settings) return NextResponse.json({ error: "settings required" }, { status: 400 });
      const { data: existing } = await db.from("anti_detection_settings").select("id").limit(1).maybeSingle();
      if (existing) {
        const { error } = await db.from("anti_detection_settings").update({ ...settings, updated_at: new Date().toISOString() }).eq("id", existing.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        const { error } = await db.from("anti_detection_settings").insert({ ...settings });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, message: "Protection settings saved" });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
