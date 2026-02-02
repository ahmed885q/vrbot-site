// app/api/agent/register/route.ts
import { NextResponse } from "next/server";
import { supabaseService } from "../../../../lib/supabase/server";
import crypto from "crypto";

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(req: Request) {
  const svc = supabaseService();
  const body = await req.json().catch(() => ({}));

  const { licenseKey, deviceId, deviceName } = body as {
    licenseKey?: string;
    deviceId?: string;
    deviceName?: string;
  };

  if (!licenseKey || !deviceId) {
    return NextResponse.json({ ok: false, error: "licenseKey and deviceId are required" }, { status: 400 });
  }

  // 1) find license
  const { data: lk } = await svc
    .from("license_keys")
    .select("id,plan_id,used_by")
    .eq("key", licenseKey)
    .maybeSingle();

  if (!lk?.used_by) {
    return NextResponse.json({ ok: false, error: "License not activated" }, { status: 403 });
  }

  // 2) active subscription for that user
  const { data: sub } = await svc
    .from("subscriptions")
    .select("id,plan_id,expires_at,status")
    .eq("user_id", lk.used_by)
    .eq("status", "active")
    .maybeSingle();

  if (!sub?.id) {
    return NextResponse.json({ ok: false, error: "No active subscription" }, { status: 403 });
  }

  if (sub.expires_at && new Date(sub.expires_at).getTime() < Date.now()) {
    // mark expired
    await svc.from("subscriptions").update({ status: "expired" }).eq("id", sub.id);
    return NextResponse.json({ ok: false, error: "Subscription expired" }, { status: 403 });
  }

  // 3) plan limits
  const { data: plan } = await svc
    .from("plans")
    .select("id,max_agents,max_devices")
    .eq("id", sub.plan_id)
    .single();

  if (!plan) return NextResponse.json({ ok: false, error: "Plan not found" }, { status: 500 });

  const trialMaxAgents = Number(process.env.TRIAL_MAX_AGENTS || 1);
  const trialMaxDevices = Number(process.env.TRIAL_MAX_DEVICES || 1);

  const maxAgents = plan.id === "trial" ? trialMaxAgents : plan.max_agents; // null => unlimited
  const maxDevices = plan.id === "trial" ? trialMaxDevices : plan.max_devices;

  // 4) upsert device
  const { data: existingDevices } = await svc
    .from("devices")
    .select("id")
    .eq("subscription_id", sub.id);

  const deviceAlreadyExists = (existingDevices || []).some(Boolean) && true;

  // if device not present and maxDevices reached => block
  const isDeviceKnown = (await svc.from("devices").select("id").eq("subscription_id", sub.id).eq("device_id", deviceId).maybeSingle()).data?.id;

  if (!isDeviceKnown && maxDevices != null && (existingDevices?.length || 0) >= maxDevices) {
    return NextResponse.json({ ok: false, error: "Device limit reached for this plan" }, { status: 403 });
  }

  await svc
    .from("devices")
    .upsert(
      {
        subscription_id: sub.id,
        device_id: deviceId,
        device_name: deviceName || deviceId,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "subscription_id,device_id" }
    );

  // 5) agent limit (we bind 1 agent per deviceId in this simple model)
  const { data: agents } = await svc
    .from("agents")
    .select("id")
    .eq("subscription_id", sub.id);

  const agentExists = (await svc.from("agents").select("id").eq("subscription_id", sub.id).eq("device_id", deviceId).maybeSingle()).data?.id;

  if (!agentExists && maxAgents != null && (agents?.length || 0) >= maxAgents) {
    return NextResponse.json({ ok: false, error: "Agent limit reached for this plan" }, { status: 403 });
  }

  await svc
    .from("agents")
    .upsert(
      {
        subscription_id: sub.id,
        device_id: deviceId,
        agent_name: deviceName || deviceId,
        status: "offline",
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "subscription_id,device_id" }
    );

  // 6) issue WS token session (valid 30 minutes, renewable)
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();

  await svc.from("agent_sessions").insert({
    subscription_id: sub.id,
    device_id: deviceId,
    token,
    expires_at: expiresAt,
  });

  return NextResponse.json({
    ok: true,
    wsToken: token,
    wsTokenExpiresAt: expiresAt,
    plan: plan.id,
  });
}
