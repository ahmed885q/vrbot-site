export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseService } from "@/lib/supabase/server";

async function isAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();
  return data?.role === "admin";
}

export async function GET(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdmin(supabase, user.id);
  if (!admin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = supabaseService();

  // 1. Hub Health
  let hubHealth: any = null;
  try {
    const hubUrl =
      process.env.WS_HUB_HEALTH_URL || "http://65.109.213.9:8787/health";
    const res = await fetch(hubUrl, { signal: AbortSignal.timeout(5000) });
    hubHealth = await res.json();
  } catch (e: any) {
    hubHealth = { error: e.message, status: "offline" };
  }

  // 2. Farms stats
  const { data: farms, error: farmsErr } = await service
    .from("user_farms")
    .select("id, user_id, name, server, bot_enabled, bot_status, created_at, last_bot_activity");

  // 3. Tokens stats
  const { data: tokens, error: tokensErr } = await service
    .from("tokens")
    .select("user_id, tokens_total, tokens_used, trial_granted, trial_expires_at, updated_at");

  // 4. Subscriptions
  const { data: subs, error: subsErr } = await service
    .from("subscriptions")
    .select("id, user_id, plan, status, current_period_end, stripe_customer_id, pro_key_code, updated_at");

  // 5. Users (basic info)
  const { data: usersData } = await service.auth.admin.listUsers();
  const users = usersData?.users?.map((u: any) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in: u.last_sign_in_at,
  })) ?? [];

  // Build user map
  const userMap: Record<string, string> = {};
  users.forEach((u: any) => {
    userMap[u.id] = u.email;
  });

  // Enrich farms with email
  const enrichedFarms = (farms ?? []).map((f: any) => ({
    ...f,
    email: userMap[f.user_id] || f.user_id,
  }));

  // Enrich tokens with email
  const enrichedTokens = (tokens ?? []).map((t: any) => ({
    ...t,
    email: userMap[t.user_id] || t.user_id,
  }));

  // Enrich subs with email
  const enrichedSubs = (subs ?? []).map((s: any) => ({
    ...s,
    email: userMap[s.user_id] || s.user_id,
  }));

  // Stats summary
  const totalFarms = farms?.length ?? 0;
  const activeFarms = farms?.filter((f: any) => f.bot_enabled)?.length ?? 0;
  const totalUsers = users.length;
  const activeSubs = subs?.filter((s: any) => s.status === "active" && new Date(s.current_period_end) > new Date())?.length ?? 0;
  const totalTokensUsed = tokens?.reduce((sum: number, t: any) => sum + (t.tokens_used || 0), 0) ?? 0;
  const totalTokensAvail = tokens?.reduce((sum: number, t: any) => sum + (t.tokens_total || 0), 0) ?? 0;

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    hub: hubHealth,
    stats: {
      totalUsers,
      totalFarms,
      activeFarms,
      activeSubs,
      totalTokensUsed,
      totalTokensAvail,
    },
    farms: enrichedFarms,
    tokens: enrichedTokens,
    subscriptions: enrichedSubs,
    users,
    errors: {
      farms: farmsErr?.message ?? null,
      tokens: tokensErr?.message ?? null,
      subs: subsErr?.message ?? null,
    },
  });
}

// POST — Admin actions
export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdmin(supabase, user.id);
  if (!admin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { action, userId, farmId } = body;
  const service = supabaseService();

  switch (action) {
    case "reset_tokens": {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const { error } = await service
        .from("tokens")
        .update({ tokens_used: 0, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Tokens reset to 0 used" });
    }

    case "disable_farm": {
      if (!farmId) return NextResponse.json({ error: "farmId required" }, { status: 400 });
      const { error } = await service
        .from("user_farms")
        .update({ bot_enabled: false, bot_status: "disabled_by_admin" })
        .eq("id", farmId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Farm disabled" });
    }

    case "enable_farm": {
      if (!farmId) return NextResponse.json({ error: "farmId required" }, { status: 400 });
      const { error } = await service
        .from("user_farms")
        .update({ bot_enabled: true, bot_status: "idle" })
        .eq("id", farmId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Farm enabled" });
    }

    case "cancel_subscription": {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const { error } = await service
        .from("subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Subscription canceled" });
    }

    case "delete_farm": {
      if (!farmId) return NextResponse.json({ error: "farmId required" }, { status: 400 });
      // Get farm owner for refund
      const { data: farm } = await service
        .from("user_farms")
        .select("user_id")
        .eq("id", farmId)
        .single();
      // Delete settings
      await service.from("farm_settings").delete().eq("farm_id", farmId);
      // Delete farm
      const { error } = await service.from("user_farms").delete().eq("id", farmId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      // Refund token
      if (farm?.user_id) {
        await service.rpc("refund_token", { p_user_id: farm.user_id });
      }
      return NextResponse.json({ ok: true, message: "Farm deleted + token refunded" });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
