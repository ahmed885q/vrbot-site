export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import {
  getNiflingQueue,
  requestNifling,
  cancelNifling,
  setNiflingPriority,
} from "@/lib/orchestrator";

// GET /api/cloud/nifling — fetch queue + stats
export async function GET() {
  try {
    const data = await getNiflingQueue();
    return NextResponse.json({ ok: true, ...data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Nifling service unreachable", details: error?.message },
      { status: 502 }
    );
  }
}

// POST /api/cloud/nifling — actions: request, cancel, priority
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, farm_id, request_id, priority } = body;

    if (action === "request") {
      if (!farm_id) return NextResponse.json({ error: "farm_id required" }, { status: 400 });
      const result = await requestNifling(farm_id, priority);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "cancel") {
      if (!request_id) return NextResponse.json({ error: "request_id required" }, { status: 400 });
      const result = await cancelNifling(request_id);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "priority") {
      if (!request_id || priority === undefined)
        return NextResponse.json({ error: "request_id and priority required" }, { status: 400 });
      const result = await setNiflingPriority(request_id, priority);
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
