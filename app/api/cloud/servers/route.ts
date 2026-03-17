export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServers, provisionServer, drainServer } from "@/lib/orchestrator";

// GET /api/cloud/servers — fetch server list
export async function GET() {
  try {
    const data = await getServers();
    return NextResponse.json({ ok: true, ...data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Server service unreachable", details: error?.message },
      { status: 502 }
    );
  }
}

// POST /api/cloud/servers — actions: provision, drain
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, server_id, server_type, region } = body;

    if (action === "provision") {
      if (!server_type || !region)
        return NextResponse.json({ error: "server_type and region required" }, { status: 400 });
      const result = await provisionServer(server_type, region);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "drain") {
      if (!server_id) return NextResponse.json({ error: "server_id required" }, { status: 400 });
      const result = await drainServer(server_id);
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
