// app/api/license/redeem/route.ts
import { NextResponse } from "next/server";
import { supabaseService } from "../../../../lib/supabase/server";

export async function POST(req: Request) {
  const svc = supabaseService();
  const body = await req.json().catch(() => ({}));
  const { userId, key } = body as { userId?: string; key?: string };

  if (!userId || !key) {
    return NextResponse.json({ ok: false, error: "userId and key are required" }, { status: 400 });
  }

  // 1) fetch license key
  const { data: lk, error: lkErr } = await svc
    .from("license_keys")
    .select("id,key,plan_id,used_by,used_at")
    .eq("key", key)
    .maybeSingle();

  if (lkErr || !lk) {
    return NextResponse.json({ ok: false, error: "Invalid key" }, { status: 400 });
  }
  if (lk.used_by) {
    return NextResponse.json({ ok: false, error: "Key already used" }, { status: 400 });
  }

  // 2) read plan
  const { data: plan, error: planErr } = await svc
    .from("plans")
    .select("id,max_agents,max_devices,duration_days")
    .eq("id", lk.plan_id)
    .single();

  if (planErr || !plan) {
    return NextResponse.json({ ok: false, error: "Plan not found" }, { status: 500 });
  }

  const trialDays = Number(process.env.TRIAL_DAYS || 7);
  const durationDays = plan.duration_days ?? (plan.id === "trial" ? trialDays : null);
  const expiresAt = durationDays ? new Date(Date.now() + durationDays * 86400_000).toISOString() : null;

  // 3) ensure no active subscription
  const { data: activeSub } = await svc
    .from("subscriptions")
    .select("id,status")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (activeSub?.id) {
    return NextResponse.json({ ok: false, error: "User already has active subscription" }, { status: 400 });
  }

  // 4) create subscription + mark key used (transaction-like)
  const { data: sub, error: subErr } = await svc
    .from("subscriptions")
    .insert({
      user_id: userId,
      plan_id: plan.id,
      license_key_id: lk.id,
      status: "active",
      expires_at: expiresAt,
    })
    .select("id,plan_id,expires_at,status")
    .single();

  if (subErr || !sub) {
    return NextResponse.json({ ok: false, error: "Failed to create subscription" }, { status: 500 });
  }

  const { error: updErr } = await svc
    .from("license_keys")
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq("id", lk.id);

  if (updErr) {
    // rollback best-effort
    await svc.from("subscriptions").delete().eq("id", sub.id);
    return NextResponse.json({ ok: false, error: "Failed to mark key used" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, subscription: sub });
}
