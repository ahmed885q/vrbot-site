export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function isAdminEmail(email: string | null | undefined) {
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!email) return false;
  return admins.includes(email.toLowerCase());
}

function getDB() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function GET() {
  const cookieStore = cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });
  const { data } = await supabase.auth.getUser();
  if (!data?.user || !isAdminEmail(data.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = getDB();

  let hubHealth: any = null;
  try {
    const hubUrl = process.env.WS_HUB_HEALTH_URL || "http://65.109.213.9:8787/health";
    const res = await fetch(hubUrl, { signal: AbortSignal.timeout(5000) });
    hubHealth = await res.json();
  } catch (e: any) {
    hubHealth = { error: e.message, status: "offline" };
  }

  const { data: farms, error: farmsErr } = await db.from("user_farms").select("id, user_id, name, server, bot_enabled, bot_status, created_at, last_bot_activity");
  const { data: tokens, error: tokensErr } = await db.from("tokens").select("user_id, tokens_total, tokens_used, trial_granted, trial_expires_at, updated_at");
  const { data: subs, error: subsErr } = await db.from("subscriptions").select("id, user_id, plan, status, current_period_end, stripe_customer_id, pro_key_code, updated_at");
  const { data: usersData } = await db.auth.admin.listUsers({ perPage: 1000 });
  const users = usersData?.users?.map((u: any) => ({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in: u.last_sign_in_at })) ?? [];

  const userMap: Record<string, string> = {};
  users.forEach((u: any) => { userMap[u.id] = u.email; });

  const enrichedFarms = (farms ?? []).map((f: any) => ({ ...f, email: userMap[f.user_id] || f.user_id }));
  const enrichedTokens = (tokens ?? []).map((t: any) => ({ ...t, email: userMap[t.user_id] || t.user_id }));
  const enrichedSubs = (subs ?? []).map((s: any) => ({ ...s, email: userMap[s.user_id] || s.user_id }));

  return NextResponse.json({
    ok: true, timestamp: new Date().toISOString(), hub: hubHealth,
    stats: {
      totalUsers: users.length,
      totalFarms: farms?.length ?? 0,
      activeFarms: farms?.filter((f: any) => f.bot_enabled)?.length ?? 0,
      activeSubs: subs?.filter((s: any) => s.status === "active")?.length ?? 0,
      totalTokensUsed: tokens?.reduce((sum: number, t: any) => sum + (t.tokens_used || 0), 0) ?? 0,
      totalTokensAvail: tokens?.reduce((sum: number, t: any) => sum + (t.tokens_total || 0), 0) ?? 0,
    },
    farms: enrichedFarms, tokens: enrichedTokens, subscriptions: enrichedSubs, users,
    errors: { farms: farmsErr?.message ?? null, tokens: tokensErr?.message ?? null, subs: subsErr?.message ?? null },
  });
}

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });
  const { data } = await supabase.auth.getUser();
  if (!data?.user || !isAdminEmail(data.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = getDB();
  const body = await req.json().catch(() => ({}));
  const { action, userId, farmId } = body;

  switch (action) {
    case "reset_tokens": {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const { error } = await db.from("tokens").update({ tokens_used: 0, updated_at: new Date().toISOString() }).eq("user_id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Tokens reset to 0 used" });
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
    case "cancel_subscription": {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const { error } = await db.from("subscriptions").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("user_id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Subscription canceled" });
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
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
