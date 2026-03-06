export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://65.109.214.187:8080";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "vrbot_webhook_secret_2026";

export async function POST(req: Request) {
  const secret = req.headers.get("x-webhook-secret");
  if (!secret || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { customer_email, customer_name, plan = "basic", farm_count = 1, nifling = false, order_id } = body;

  if (!customer_email || !order_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const service = supabaseService();
    await service.from("provision_logs").insert({
      order_id, customer_email, customer_name, plan, farm_count, nifling,
      status: "pending", created_at: new Date().toISOString(),
    });

    const res = await fetch(ORCHESTRATOR_URL + "/api/webhook/order", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Webhook-Secret": WEBHOOK_SECRET },
      body: JSON.stringify({ event: "order.created", customer_email, customer_name, plan, farm_count, nifling, order_id }),
    });

    const result = await res.json();

    if (!res.ok) {
      await service.from("provision_logs").update({ status: "error", error_message: JSON.stringify(result) }).eq("order_id", order_id);
      return NextResponse.json({ error: "Orchestrator error", details: result }, { status: 500 });
    }

    await service.from("provision_logs").update({ status: "provisioning", job_id: result.job_id, customer_id: result.customer_id }).eq("order_id", order_id);

    return NextResponse.json({
      ok: true, customer_id: result.customer_id, job_id: result.job_id, farm_count,
      message: "Provisioning " + farm_count + " farms...",
      status_url: "/api/webhook/provision/" + result.job_id,
    });
  } catch (error) {
    console.error("Provision webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
