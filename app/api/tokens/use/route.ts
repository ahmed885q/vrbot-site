export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const service = supabaseService();
    const { data, error } = await service.rpc("use_token", {
      p_user_id: user.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // data = { status, allowed, remaining? }
    if (!data.allowed) {
      return NextResponse.json(data, { status: 403 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
