export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://65.109.214.187:8080";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { job_id } = body;

  if (!job_id) {
    return NextResponse.json({ error: "Missing job_id" }, { status: 400 });
  }

  try {
    const res = await fetch(ORCHESTRATOR_URL + "/api/provision/" + job_id);
    if (!res.ok) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    const result = await res.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const job_id = url.searchParams.get("job_id");

  if (!job_id) {
    return NextResponse.json({ error: "Missing job_id param" }, { status: 400 });
  }

  try {
    const res = await fetch(ORCHESTRATOR_URL + "/api/provision/" + job_id);
    if (!res.ok) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    const result = await res.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}
