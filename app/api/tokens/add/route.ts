export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    // This endpoint is called internally after PayPal payment confirmation
    // Verify admin password or service key
    const body = await req.json();
    const { user_id, farm_count, admin_password } = body;

    if (!admin_password || admin_password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user_id || !farm_count || farm_count < 1) {
      return NextResponse.json({ error: "Missing user_id or farm_count" }, { status: 400 });
    }

    const service = supabaseService();
    const { data, error } = await service.rpc("add_paid_tokens", {
      p_user_id: user_id,
      p_count: farm_count,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
