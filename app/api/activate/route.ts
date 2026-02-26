export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { license_key, hardware_id } = body;

    if (!license_key) {
      return NextResponse.json(
        { detail: "License key is required" },
        { status: 400 }
      );
    }

    const db = getServiceClient();
    let userId: string | null = null;
    let plan = "free";

    // --- 1. Check pro_keys table ---
    const { data: proKey } = await db
      .from("pro_keys")
      .select("*")
      .eq("code", license_key)
      .single();

    if (proKey) {
      if (proKey.revoked || proKey.revoked_at) {
        return NextResponse.json(
          { detail: "This key has been revoked" },
          { status: 403 }
        );
      }
      if (proKey.is_used && proKey.used_by) {
        userId = proKey.used_by;
      } else {
        // Key is valid and not yet used — activate it now
        // Link it to the creator (created_by) as the owner
        userId = proKey.created_by;
        if (userId) {
          await db
            .from("pro_keys")
            .update({
              is_used: true,
              used_by: userId,
              used_at: new Date().toISOString(),
            })
            .eq("id", proKey.id);
        } else {
          return NextResponse.json(
            { detail: "Key has no owner. Please contact support." },
            { status: 400 }
          );
        }
      }
    }

    // --- 2. Check license_keys table if not found in pro_keys ---
    if (!userId) {
      const { data: licKey } = await db
        .from("license_keys")
        .select("*")
        .eq("key", license_key)
        .single();

      if (licKey) {
        if (licKey.used_by) {
          userId = licKey.used_by;
          plan = licKey.plan_id || "free";
        } else {
          return NextResponse.json(
            { detail: "Key not linked to any account" },
            { status: 400 }
          );
        }
      }
    }

    // --- 3. Not found in any table ---
    if (!userId) {
      return NextResponse.json(
        { detail: "Invalid license key" },
        { status: 404 }
      );
    }

    // --- 4. Get subscription info ---
    const { data: sub } = await db
      .from("subscriptions")
      .select("plan, status, current_period_end")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("current_period_end", { ascending: false })
      .limit(1)
      .single();

    if (sub) {
      plan = sub.plan || plan;
    }

    // --- 5. Get token info ---
    const { data: tokens } = await db
      .from("tokens")
      .select("tokens_total, tokens_used, trial_granted, trial_expires_at")
      .eq("user_id", userId)
      .single();

    const tokensRemaining = tokens
      ? tokens.tokens_total - tokens.tokens_used
      : 0;

    // --- 6. Get farm count ---
    const { count: farmCount } = await db
      .from("user_farms")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    // --- 7. Determine max_farms based on plan ---
    const maxFarmsMap: Record<string, number> = {
      free: 1,
      trial: 1,
      basic: 5,
      pro: 20,
      enterprise: 100,
    };
    const maxFarms = tokens
      ? tokens.tokens_total
      : maxFarmsMap[plan] || 5;

    // --- 8. Determine expiration ---
    let expiresAt = sub?.current_period_end || null;
    if (!expiresAt && tokens?.trial_granted && tokens?.trial_expires_at) {
      expiresAt = tokens.trial_expires_at;
    }
    if (!expiresAt) {
      // Default: 30 days from now
      const d = new Date();
      d.setDate(d.getDate() + 30);
      expiresAt = d.toISOString();
    }

    // --- 9. Update hardware_id (optional tracking) ---
    if (hardware_id) {
      await db
        .from("license_keys")
        .update({ hardware_id })
        .eq("key", license_key)
        .then(() => {});
      // Also try pro_keys
      await db
        .from("pro_keys")
        .update({ hardware_id })
        .eq("code", license_key)
        .then(() => {});
    }

    // --- 10. Return success ---
    return NextResponse.json({
      plan,
      max_farms: maxFarms,
      expires_at: expiresAt,
      farms_active: farmCount || 0,
      tokens_remaining: tokensRemaining,
      user_id: userId,
    });
  } catch (err: any) {
    console.error("[ACTIVATE ERROR]", err);
    return NextResponse.json(
      { detail: "Server error" },
      { status: 500 }
    );
  }
}
