export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { supabaseService } from "@/lib/supabase/server";
import { provisionFarms } from "@/lib/orchestrator";

// --- Admin session verification ---
function verifyAdmin(): { valid: boolean; email?: string } {
  const cookie = cookies().get("admin_session")?.value;
  if (!cookie) return { valid: false };
  const [email, timestamp, signature] = cookie.split(".");
  if (!email || !timestamp || !signature) return { valid: false };
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return { valid: false };
  const expected = crypto.createHmac("sha256", secret).update(email + timestamp).digest("hex");
  if (signature !== expected) return { valid: false };
  const age = Date.now() - Number(timestamp);
  if (age > 86400000) return { valid: false }; // 24h
  return { valid: true, email };
}

// --- GET: List ALL farms (any user) ---
export async function GET(req: Request) {
  const auth = verifyAdmin();
  if (!auth.valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = supabaseService();
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const userId = url.searchParams.get("user_id") || "";

  let query = service
    .from("user_farms")
    .select("id, user_id, name, server, notes, created_at, cloud_status, cloud_customer_id, cloud_job_id")
    .order("created_at", { ascending: false })
    .limit(100);

  if (userId) query = query.eq("user_id", userId);
  if (search) query = query.or(`name.ilike.%${search}%,id.eq.${search}`);

  const { data: farms, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ farms, count: farms?.length || 0 });
}

// --- POST: Create farm WITHOUT token (admin bypass) ---
export async function POST(req: Request) {
  const auth = verifyAdmin();
  if (!auth.valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const userId = body?.user_id;
  const name = String(body?.name ?? "").trim();
  const server = String(body?.server ?? "").trim() || null;
  const notes = String(body?.notes ?? "Admin created").trim();
  const cloudEnabled = body?.cloud !== false;

  if (!name) return NextResponse.json({ error: "Missing farm name" }, { status: 400 });

  const service = supabaseService();

  // If user_id provided, verify user exists
  if (userId) {
    const { data: profile } = await service.from("profiles").select("id").eq("id", userId).single();
    if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // NO TOKEN CHECK - Admin bypass
  const { data: farm, error } = await service
    .from("user_farms")
    .insert({
      user_id: userId || null,
      name,
      server,
      notes,
      cloud_status: cloudEnabled ? "pending" : "local",
    })
    .select("id, user_id, name, server, notes, created_at, cloud_status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create empty settings
  if (farm) {
    await service
      .from("farm_settings")
      .upsert({ farm_id: farm.id, user_id: userId || null, settings: {} }, { onConflict: "farm_id" });
  }

  // Cloud provisioning if enabled
  let cloudResult: any = null;
  if (cloudEnabled && userId) {
    try {
      const { data: profile } = await service.from("profiles").select("email, name").eq("id", userId).single();
      cloudResult = await provisionFarms({
        customerEmail: profile?.email || "",
        customerName: profile?.name || "Admin-Created",
        plan: "basic",
        farmCount: 1,
        nifling: false,
        orderId: `admin-${farm.id}-${Date.now()}`,
      });
      if (cloudResult?.job_id || cloudResult?.customer_id) {
        await service
          .from("user_farms")
          .update({
            cloud_customer_id: cloudResult.customer_id || null,
            cloud_job_id: cloudResult.job_id || null,
            cloud_status: "provisioning",
          })
          .eq("id", farm.id);
      }
    } catch (e: any) {
      await service.from("user_farms").update({ cloud_status: "cloud_error" }).eq("id", farm.id);
      cloudResult = { error: e?.message || "Cloud unreachable" };
    }
  }

  return NextResponse.json({ ok: true, farm, cloud: cloudResult });
}

// --- PUT: Update any farm ---
export async function PUT(req: Request) {
  const auth = verifyAdmin();
  if (!auth.valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const farmId = body?.farm_id;
  if (!farmId) return NextResponse.json({ error: "Missing farm_id" }, { status: 400 });

  const service = supabaseService();
  const updates: Record<string, any> = {};
  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.server !== undefined) updates.server = String(body.server).trim() || null;
  if (body.notes !== undefined) updates.notes = String(body.notes).trim() || null;
  if (body.user_id !== undefined) updates.user_id = body.user_id;
  if (body.cloud_status !== undefined) updates.cloud_status = body.cloud_status;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data: farm, error } = await service
    .from("user_farms")
    .update(updates)
    .eq("id", farmId)
    .select("id, user_id, name, server, notes, created_at, cloud_status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, farm });
}

// --- DELETE: Delete any farm ---
export async function DELETE(req: Request) {
  const auth = verifyAdmin();
  if (!auth.valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const farmId = url.searchParams.get("farm_id");
  if (!farmId) return NextResponse.json({ error: "Missing farm_id" }, { status: 400 });

  const service = supabaseService();

  // Delete settings first
  await service.from("farm_settings").delete().eq("farm_id", farmId);

  // Delete farm
  const { error } = await service.from("user_farms").delete().eq("id", farmId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Refund token
  const { data: farm } = await service.from("user_farms").select("user_id").eq("id", farmId).single();
  if (farm?.user_id) {
    await service.rpc("refund_token", { p_user_id: farm.user_id }).catch(() => {});
  }

  return NextResponse.json({ ok: true, deleted: farmId });
}
