export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAllCircuitStatuses } from "@/lib/circuit-breaker";

export async function GET() {
  const statuses = getAllCircuitStatuses();
  return NextResponse.json({
    circuits: statuses,
    summary: {
      total: statuses.length,
      open: statuses.filter(s => s.state === "OPEN").length,
      closed: statuses.filter(s => s.state === "CLOSED").length,
      halfOpen: statuses.filter(s => s.state === "HALF_OPEN").length,
    }
  });
}
