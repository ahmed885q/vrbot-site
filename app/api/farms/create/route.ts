export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseService } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const server = String(body?.server ?? "").trim() || null;
  const notes = String(body?.notes ?? "").trim() || null;

  if (!name)
    return NextResponse.json({ error: "Missing farm name" }, { status: 400 });

  // --- TOKEN CHECK ---
  const service = supabaseService();
  const { data: tokenResult, error: tokenError } = await service.rpc(
    "use_token",
    { p_user_id: user.id }
  );

  if (tokenError) {
    return NextResponse.json(
      { error: "Token check failed: " + tokenError.message },
      { status: 500 }
    );
  }

  if (!tokenResult.allowed) {
    const messages: Record<string, string> = {
      no_tokens: "No tokens available. Please subscribe first.",
      trial_expired: "Your free trial has expired. Please subscribe to continue.",
      no_available: `All tokens used (${tokenResult.used}/${tokenResult.total}). Buy more farms to add more.`,
    };
    return NextResponse.json(
      { error: messages[tokenResult.status] || "No tokens available" },
      { status: 403 }
    );
  }

  // --- CREATE FARM ---
  const { data: farm, error } = await supabase
    .from("user_farms")
    .insert({ user_id: user.id, name, server, notes })
    .select("id,name,server,notes,created_at")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // create empty settings row
  await supabase
    .from("farm_settings")
    .upsert(
      { farm_id: farm.id, user_id: user.id, settings: {} },
      { onConflict: "farm_id" }
    );

  return NextResponse.json({
    ok: true,
    farm,
    tokens_remaining: tokenResult.remaining,
  });
}
