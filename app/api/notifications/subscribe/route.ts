import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { subscription } = body; // PushSubscription object

  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys?.p256dh,
    auth: subscription.keys?.auth,
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await req.json();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
