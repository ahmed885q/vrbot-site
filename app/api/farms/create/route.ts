export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseService } from "@/lib/supabase/server";
import { provisionFarms } from "@/lib/orchestrator";
import crypto from "crypto";

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

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const server = String(body?.server ?? "").trim() || null;
  const notes = String(body?.notes ?? "").trim() || null;
  const cloudEnabled = body?.cloud !== false; // default: provision on cloud

  if (!name)
    return NextResponse.json({ error: "Missing farm name" }, { status: 400 });

  // --- TOKEN CHECK ---
  const service = supabaseService();
  const { data: tokenResult, error: tokenError } = await service.rpc(
    "use_token",
    { p_user_id: user.id }
  );

  if (tokenError) {
    return NextResponse.json(
      { error: "Token check failed: " + tokenError.message },
      { status: 500 }
    );
  }

  if (!tokenResult.allowed) {
    const messages: Record<string, string> = {
      no_tokens: "No tokens available. Please subscribe first.",
      trial_expired: "Your free trial has expired. Please subscribe to continue.",
      no_available: `All tokens used (${tokenResult.used}/${tokenResult.total}). Buy more farms to add more.`,
    };
    return NextResponse.json(
      { error: messages[tokenResult.status] || "No tokens available" },
      { status: 403 }
    );
  }

  // --- CREATE FARM IN SUPABASE ---
  const { data: farm, error } = await supabase
    .from("user_farms")
    .insert({
      user_id: user.id,
      name,
      server,
      notes,
      cloud_status: cloudEnabled ? "pending" : "local",
    })
    .select("id,name,server,notes,created_at,cloud_status")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // create empty settings row
  await supabase
    .from("farm_settings")
    .upsert(
      { farm_id: farm.id, user_id: user.id, settings: {} },
      { onConflict: "farm_id" }
    );

  // --- AUTO-CREATE AGENT + TOKEN ---
  const agentId = `farm-${farm.id}`;
  const agentToken = `vrbot_${crypto.randomBytes(32).toString("hex")}`;
  let agentInfo: any = null;

  try {
    // 1. Create agent record in DB
    await service.rpc("upsert_agent_status", {
      p_user_id: user.id,
      p_agent_id: agentId,
      p_device_id: name,
      p_status: "offline",
      p_bot_state: "STOPPED",
    });

    // 2. Create auth token linked to this farm
    await service.from("agent_tokens").insert({
      user_id: user.id,
      token: agentToken,
      label: `auto:${name}`,
      is_active: true,
    });

    // 3. Link agent to farm in config
    await service
      .from("agents")
      .update({ config: { farm_id: farm.id, farm_name: name, auto_created: true } })
      .eq("user_id", user.id)
      .eq("agent_id", agentId);

    agentInfo = { agent_id: agentId, token: agentToken };
  } catch (agentErr: any) {
    console.error("Auto-create agent/token error:", agentErr?.message);
    // Non-blocking — farm was created, agent can be set up manually
  }

  // --- PROVISION ON CLOUD (async, non-blocking) ---
  let cloudResult: any = null;
  if (cloudEnabled) {
    try {
      cloudResult = await provisionFarms({
        customerEmail: user.email || "",
        customerName: user.user_metadata?.name || user.email?.split("@")[0] || "User",
        plan: "basic",
        farmCount: 1,
        nifling: false,
        orderId: `dashboard-${farm.id}-${Date.now()}`,
        // Pass agent credentials to inject into cloud container env
        ...(agentInfo ? {
          agentUserId: user.id,
          agentToken: agentToken,
          agentId: agentId,
        } : {}),
      });

      // Update farm with cloud info
      if (cloudResult.job_id || cloudResult.customer_id) {
        await service
          .from("user_farms")
          .update({
            cloud_customer_id: cloudResult.customer_id || null,
            cloud_job_id: cloudResult.job_id || null,
            cloud_status: "provisioning",
          })
          .eq("id", farm.id);

        farm.cloud_status = "provisioning";
      }
    } catch (cloudError: any) {
      // Cloud provisioning failed but farm was created in Supabase
      // Mark as local-only, user can retry cloud provisioning later
      await service
        .from("user_farms")
        .update({ cloud_status: "cloud_error" })
        .eq("id", farm.id);

      farm.cloud_status = "cloud_error";
      cloudResult = { error: cloudError?.message || "Cloud server unreachable" };
    }
  }

  return NextResponse.json({
    ok: true,
    farm,
    tokens_remaining: tokenResult.remaining,
    cloud: cloudResult,
    agent: agentInfo,
  });
}
