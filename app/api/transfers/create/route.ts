import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Body = {
  fromFarmId?: string | null;
  toPlayerType: "name" | "id";
  toPlayerValue: string;
  resourceType: string;
  amount: number;
  note?: string;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id || session?.user?.email;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // validation
  if (!body.toPlayerType || !["name", "id"].includes(body.toPlayerType)) {
    return NextResponse.json({ error: "toPlayerType must be name|id" }, { status: 400 });
  }
  if (!body.toPlayerValue?.trim()) {
    return NextResponse.json({ error: "toPlayerValue is required" }, { status: 400 });
  }
  if (!body.resourceType?.trim()) {
    return NextResponse.json({ error: "resourceType is required" }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("transfers")
    .insert({
      user_id: String(userId),
      from_farm_id: body.fromFarmId ?? null,
      to_player_type: body.toPlayerType,
      to_player_value: body.toPlayerValue.trim(),
      resource_type: body.resourceType.trim(),
      amount: Math.floor(amount),
      note: body.note?.trim() || null,
      status: "queued",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ✅ هنا مكان التنفيذ الفعلي (اختياري)
  // مثال: إرسال للـ worker queue / webhook
  // await fetch(process.env.TRANSFER_WORKER_URL!, { method:"POST", body: JSON.stringify({transferId: data.id}) })

  return NextResponse.json({ transfer: data });
}
