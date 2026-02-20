import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id || session?.user?.email;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { transferId } = await req.json().catch(() => ({} as any));
  if (!transferId) {
    return NextResponse.json({ error: "transferId is required" }, { status: 400 });
  }

  // فقط queued يسمح بالإلغاء
  const { data: existing, error: readErr } = await supabase
    .from("transfers")
    .select("id,status,user_id")
    .eq("id", transferId)
    .single();

  if (readErr || !existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (String(existing.user_id) !== String(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (existing.status !== "queued") {
    return NextResponse.json({ error: "Only queued transfers can be canceled" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("transfers")
    .update({ status: "canceled" })
    .eq("id", transferId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ transfer: data });
}
