export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "vrbot_webhook_secret_2026";

export async function POST(req: Request) {
  try {
    // تحقق من الـ secret
    const secret = req.headers.get("X-Webhook-Secret");
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { farm_id, user_id, event_type, message, tasks } = body;

    if (!farm_id || !event_type) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Resolve user_id from farm_name if not provided
    let resolvedUserId = user_id;
    if (!resolvedUserId) {
      const { data: farm } = await service
        .from("cloud_farms")
        .select("user_id")
        .eq("farm_name", farm_id)
        .single();
      resolvedUserId = farm?.user_id;
    }

    // Build task string for message
    const taskStr = tasks?.length ? ` | Tasks: ${tasks.join(", ")}` : "";

    // 1. أدخل الحدث في farm_alerts (existing table)
    await service.from("farm_alerts").insert({
      user_id:    resolvedUserId || null,
      farm_id:    resolvedUserId || "00000000-0000-0000-0000-000000000000",
      type:       event_type,
      severity:   event_type === "error" || event_type === "task_failed" ? "high" : "info",
      message:    (message || `${event_type} on ${farm_id}`) + taskStr,
    });

    // 2. حدّث آخر نشاط للمزرعة
    if (["task_complete", "task_failed", "farm_started", "farm_stopped"].includes(event_type)) {
      await service
        .from("cloud_farms")
        .update({
          status: event_type === "farm_started" ? "running"
                : event_type === "farm_stopped" ? "stopped"
                : "running",
          last_heartbeat: new Date().toISOString(),
        })
        .eq("farm_name", farm_id);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
