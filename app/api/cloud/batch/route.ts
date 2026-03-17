export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getBatchStatus, getBatchHistory } from "@/lib/orchestrator";

// GET /api/cloud/batch — fetch current batch or history
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const history = url.searchParams.get("history");

    if (history === "1") {
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const data = await getBatchHistory(limit);
      return NextResponse.json({ ok: true, batches: data });
    }

    const data = await getBatchStatus();
    return NextResponse.json({ ok: true, ...data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Batch service unreachable", details: error?.message },
      { status: 502 }
    );
  }
}
