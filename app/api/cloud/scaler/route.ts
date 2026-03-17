export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getScalerStatus, setScalerMode, setScalerBudget } from "@/lib/orchestrator";

// GET /api/cloud/scaler — fetch scaler status
export async function GET() {
  try {
    const data = await getScalerStatus();
    return NextResponse.json({ ok: true, ...data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Scaler service unreachable", details: error?.message },
      { status: 502 }
    );
  }
}

// POST /api/cloud/scaler — actions: set_mode, set_budget
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, mode, budget } = body;

    if (action === "set_mode") {
      if (!mode) return NextResponse.json({ error: "mode required" }, { status: 400 });
      const result = await setScalerMode(mode);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "set_budget") {
      if (budget === undefined) return NextResponse.json({ error: "budget required" }, { status: 400 });
      const result = await setScalerBudget(budget);
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
