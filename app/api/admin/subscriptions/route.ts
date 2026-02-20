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
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data } = await supabase.auth.getUser();
  if (!data?.user || !isAdminEmail(data.user.email)) return null;
  return data.user;
}

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET: list all subscriptions
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = adminDb();

  // Get all subscriptions with user email
  const { data: subs, error } = await db
    .from("subscriptions")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get user emails
  const userIds = (subs || []).map((s: any) => s.user_id);
  const { data: usersData } = await db.auth.admin.listUsers({ perPage: 1000 });
  const emailMap: Record<string, string> = {};
  (usersData?.users || []).forEach((u: any) => {
    emailMap[u.id] = u.email || "";
  });

  const result = (subs || []).map((s: any) => ({
    ...s,
    email: emailMap[s.user_id] || "unknown",
  }));

  return NextResponse.json({ subscriptions: result });
}

// POST: activate or deactivate a user
export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action, email, plan, days } = body;
  // action: "activate" | "deactivate" | "extend"

  const db = adminDb();

  if (action === "activate") {
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    // Find user by email
    const { data: usersData } = await db.auth.admin.listUsers({ perPage: 1000 });
    const user = usersData?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return NextResponse.json({ error: `User not found: ${email}` }, { status: 404 });
    }

    const periodDays = days || 30;
    const periodEnd = new Date(Date.now() + periodDays * 86400000).toISOString();

    // Upsert subscription
    const { error } = await db.from("subscriptions").upsert(
      {
        user_id: user.id,
        plan: plan || "pro",
        status: "active",
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
        stripe_customer_id: "admin_manual",
        stripe_subscription_id: `admin_${Date.now()}`,
        price_id: "admin_granted",
      },
      { onConflict: "user_id" }
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      message: `${email} activated for ${periodDays} days`,
      period_end: periodEnd,
    });
  }

  if (action === "deactivate") {
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const { data: usersData } = await db.auth.admin.listUsers({ perPage: 1000 });
    const user = usersData?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return NextResponse.json({ error: `User not found: ${email}` }, { status: 404 });
    }

    const { error } = await db
      .from("subscriptions")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      message: `${email} deactivated`,
    });
  }

  if (action === "extend") {
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const { data: usersData } = await db.auth.admin.listUsers({ perPage: 1000 });
    const user = usersData?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return NextResponse.json({ error: `User not found: ${email}` }, { status: 404 });
    }

    // Get current subscription
    const { data: sub } = await db
      .from("subscriptions")
      .select("current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    const baseDate = sub?.current_period_end
      ? new Date(sub.current_period_end)
      : new Date();
    const extendDays = days || 30;
    const newEnd = new Date(baseDate.getTime() + extendDays * 86400000).toISOString();

    const { error } = await db
      .from("subscriptions")
      .update({
        status: "active",
        current_period_end: newEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      message: `${email} extended by ${extendDays} days`,
      new_period_end: newEnd,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
