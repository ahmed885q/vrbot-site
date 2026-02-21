export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const service = supabaseService();
    const { data, error } = await service
      .from("tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code === "PGRST116") {
      // No token record yet
      return NextResponse.json({
        tokens_total: 0,
        tokens_used: 0,
        tokens_available: 0,
        trial_granted: false,
        trial_expired: false,
      });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const trial_expired =
      data.trial_granted &&
      data.tokens_total === 1 &&
      data.trial_expires_at &&
      new Date(data.trial_expires_at) < new Date();

    return NextResponse.json({
      tokens_total: data.tokens_total,
      tokens_used: data.tokens_used,
      tokens_available: trial_expired ? 0 : data.tokens_total - data.tokens_used,
      trial_granted: data.trial_granted,
      trial_expired,
      trial_expires_at: data.trial_expires_at,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
