export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { supabaseService } from "@/lib/supabase/server";
import { provisionFarms } from "@/lib/orchestrator";

// --- Admin session verification ---
function verifyAdmin(): { valid: boolean; email?: string } {
  const cookie = cookies().get("admin_session")?.value;
  if (!cookie) return { valid: false };
  const [email, timestamp, signature] = cookie.split("|");
  if (!email || !timestamp || !signature) return { valid: false };
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return { valid: false };
  const expected = crypto.createHmac("sha256", secret).update(email + timestamp).digest("hex");
  if (signature !== expected) return { valid: false };
  const age = Date.now() - Number(timestamp);
  if (age > 86400000) return { valid: false }; // 24h
  return { valid: true, email };
}

// --- GET: List ALL farms (any user) ---
export async function GET(req: Request) {
  const auth = verifyAdmin();
  if (!auth.valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = supabaseService();
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const userId = url.searchParams.get("user_id") || "";

  let query = service
    .from("user_farms")
    .select("id, user_id, name, server, notes, created_at, cloud_status, cloud_customer_id, cloud_job_id")
    .order("created_at", { ascending: false })
