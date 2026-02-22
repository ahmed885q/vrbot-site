export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseService } from "@/lib/supabase/server";

export async function DELETE(req: Request) {
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

  const url = new URL(req.url);
  const farmId = url.searchParams.get("id");
  if (!farmId)
    return NextResponse.json({ error: "Missing farm id" }, { status: 400 });

  // Verify farm belongs to user before deleting
  const { data: farm, error: fetchError } = await supabase
    .from("user_farms")
    .select("id")
    .eq("id", farmId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !farm)
    return NextResponse.json({ error: "Farm not found" }, { status: 404 });

  // Delete farm settings first (cleanup)
  await supabase
    .from("farm_settings")
    .delete()
    .eq("farm_id", farmId);

  // Delete the farm
  const { error } = await supabase
    .from("user_farms")
    .delete()
    .eq("id", farmId)
    .eq("user_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Refund token
  const service = supabaseService();
  const { data: refundResult, error: refundError } = await service.rpc(
    "refund_token",
    { p_user_id: user.id }
  );

  return NextResponse.json({
    ok: true,
    refund: refundResult ?? null,
    refund_error: refundError?.message ?? null,
  });
}
