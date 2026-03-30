export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function isAdminEmail(email: string | null | undefined) {
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!email) return false;
  return admins.includes(email.toLowerCase());
}

async function getAdmin() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data } = await supabase.auth.getUser();
  if (!data?.user || !isAdminEmail(data.user.email)) return null;
  return data.user;
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// ═══════════════════════════════════════
// GET: عرض كل المزارع مع بريد المالك
// ═══════════════════════════════════════
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = db();

  const { data: farms, error } = await service
    .from("cloud_farms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get user emails
  const { data: usersData } = await service.auth.admin.listUsers({ perPage: 1000 });
  const emailMap: Record<string, string> = {};
  (usersData?.users || []).forEach((u: any) => {
    emailMap[u.id] = u.email || "";
  });

  const result = (farms || []).map((f: any) => ({
    ...f,
    email: emailMap[f.user_id] || "unknown",
  }));

  return NextResponse.json({ farms: result, count: result.length });
}

// ═══════════════════════════════════════
// POST: إنشاء / حذف / تحديث / منح / نقل ملكية
// ═══════════════════════════════════════
export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { action } = body;
  const service = db();

  // ──────────────────────────────────
  // إنشاء مزرعة (أدمن — بدون دفع)
  // ──────────────────────────────────
  if (action === "create") {
    const { user_email, farm_name, game_account, igg_password } = body;

    if (!farm_name) return NextResponse.json({ error: "farm_name required" }, { status: 400 });

    // Find target user (optional — defaults to admin)
    let userId = admin.id;
    if (user_email) {
      const { data: usersData } = await service.auth.admin.listUsers({ perPage: 1000 });
      const user = usersData?.users?.find(
        (u: any) => u.email?.toLowerCase() === user_email.toLowerCase()
      );
      if (!user) return NextResponse.json({ error: `User not found: ${user_email}` }, { status: 404 });
      userId = user.id;
    }

    const { data: farm, error } = await service
      .from("cloud_farms")
      .insert({
        user_id: userId,
        farm_name,
        server_id: "server-01",
        game_account: game_account || "",
        status: "provisioning",
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Trigger Hetzner login if credentials provided
    if (game_account && igg_password) {
      const HETZNER = process.env.HETZNER_IP || "88.99.64.19";
      fetch(`https://${HETZNER}/api/farms/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.VRBOT_API_KEY || "",
        },
        body: JSON.stringify({
          user_id: userId,
          nickname: farm_name,
          igg_email: game_account,
          igg_password,
        }),
      })
        .then(async (r) => {
          const d = await r.json().catch(() => ({}));
          if (d.android_id) {
            await service.from("cloud_farms").update({ status: "running" }).eq("id", farm.id);
          }
        })
        .catch(() => {});
    }

    return NextResponse.json({ ok: true, farm });
  }

  // ──────────────────────────────────
  // حذف مزرعة
  // ──────────────────────────────────
  if (action === "delete") {
    const { farm_id } = body;
    if (!farm_id) return NextResponse.json({ error: "farm_id required" }, { status: 400 });

    const { error } = await service.from("cloud_farms").delete().eq("id", farm_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: farm_id });
  }

  // ──────────────────────────────────
  // تحديث حالة / بيانات مزرعة
  // ──────────────────────────────────
  if (action === "update") {
    const { farm_id, status, game_account, farm_name } = body;
    if (!farm_id) return NextResponse.json({ error: "farm_id required" }, { status: 400 });

    const updates: any = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (game_account !== undefined) updates.game_account = game_account;
    if (farm_name) updates.farm_name = farm_name;

    const { data: farm, error } = await service
      .from("cloud_farms")
      .update(updates)
      .eq("id", farm_id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, farm });
  }

  // ──────────────────────────────────
  // منح مزارع لمستخدم بدون دفع
  // ──────────────────────────────────
  if (action === "grant") {
    const { user_email, count, days } = body;
    if (!user_email) return NextResponse.json({ error: "user_email required" }, { status: 400 });

    const farmCount = Math.max(1, Math.min(50, parseInt(count || "1")));
    const periodDays = days || 30;

    // Find user
    const { data: usersData } = await service.auth.admin.listUsers({ perPage: 1000 });
    const user = usersData?.users?.find(
      (u: any) => u.email?.toLowerCase() === user_email.toLowerCase()
    );
    if (!user) return NextResponse.json({ error: `User not found: ${user_email}` }, { status: 404 });

    // 1. Create farms
    const farmsToInsert = [];
    for (let i = 0; i < farmCount; i++) {
      farmsToInsert.push({
        user_id: user.id,
        farm_name: `farm-${Date.now()}-${i + 1}`,
        server_id: "server-01",
        game_account: "",
        status: "provisioning",
      });
    }

    const { data: createdFarms, error: farmErr } = await service
      .from("cloud_farms")
      .insert(farmsToInsert)
      .select("id, farm_name");

    if (farmErr) return NextResponse.json({ error: farmErr.message }, { status: 500 });

    // 2. Activate subscription (free grant)
    const periodEnd = new Date(Date.now() + periodDays * 86400000).toISOString();

    const { data: existingSub } = await service
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingSub) {
      await service.from("subscriptions").update({
        status: "active",
        plan: "pro",
        stripe_subscription_id: `admin_grant_${Date.now()}`,
        stripe_customer_id: "admin_granted",
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    } else {
      await service.from("subscriptions").insert({
        user_id: user.id,
        status: "active",
        plan: "pro",
        stripe_subscription_id: `admin_grant_${Date.now()}`,
        stripe_customer_id: "admin_granted",
        current_period_end: periodEnd,
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Granted ${farmCount} farm(s) to ${user_email} for ${periodDays} days`,
      farms: createdFarms,
      period_end: periodEnd,
    });
  }

  // ──────────────────────────────────
  // نقل ملكية مزرعة لمستخدم آخر
  // ──────────────────────────────────
  if (action === "transfer_ownership") {
    const { farm_id, new_owner_email } = body;
    if (!farm_id || !new_owner_email) return NextResponse.json({ error: "farm_id and new_owner_email required" }, { status: 400 });

    const { data: usersData } = await service.auth.admin.listUsers({ perPage: 1000 });
    const newOwner = usersData?.users?.find(
      (u: any) => u.email?.toLowerCase() === new_owner_email.toLowerCase()
    );
    if (!newOwner) return NextResponse.json({ error: `User not found: ${new_owner_email}` }, { status: 404 });

    const { error } = await service
      .from("cloud_farms")
      .update({ user_id: newOwner.id, updated_at: new Date().toISOString() })
      .eq("id", farm_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, transferred: farm_id, new_owner: new_owner_email });
  }

  return NextResponse.json({ error: "Invalid action. Use: create, delete, update, grant, transfer_ownership" }, { status: 400 });
}
