export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { startScheduler, stopScheduler } from "@/lib/orchestrator";

// POST /api/cloud/scheduler — start or stop the scheduler
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === "start") {
      const result = await startScheduler();
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "stop") {
      const result = await stopScheduler();
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "action must be 'start' or 'stop'" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
