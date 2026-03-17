export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getLogs, getLogSources } from "@/lib/orchestrator";

// GET /api/cloud/logs — fetch logs with filters
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sources = url.searchParams.get("_sources");

    // If _sources param, return log sources list
    if (sources === "1") {
      const data = await getLogSources();
      return NextResponse.json({ ok: true, sources: data });
    }

    // Otherwise, fetch logs with filter params
    const filter: Record<string, any> = {};
    for (const [key, val] of url.searchParams.entries()) {
      if (key !== "_sources" && val) filter[key] = val;
    }

    const data = await getLogs(Object.keys(filter).length ? filter : undefined);
    return NextResponse.json({ ok: true, ...data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Logs service unreachable", details: error?.message },
      { status: 502 }
    );
  }
}
