export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getStatus } from "@/lib/orchestrator";

export async function GET() {
  try {
    const status = await getStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Cloud server unreachable", details: error?.message },
      { status: 502 }
    );
  }
}
