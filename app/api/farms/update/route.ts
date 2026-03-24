export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

async function getUser(req: Request) {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (token && token !== "undefined" && token !== "null") {
    const { data } = await service.auth.getUser(token);
    if (data?.user) return { user: data.user, service };
  }

  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c: any[]) => {
            try {
              c.forEach(({ name, value, options }: any) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );
    const { data } = await supabase.auth.getUser();
    if (data?.user) return { user: data.user, service };
  } catch {}

  return null;
}

export async function PATCH(req: Request) {
  try {
    const auth = await getUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, service } = auth;

    const body = await req.json().catch(() => ({}));
    const { farm_name, game_account } = body;

    if (!farm_name)
      return NextResponse.json({ error: "farm_name required" }, { status: 400 });

    // تحقق من ملكية المزرعة
    const { data: existing } = await service
      .from("cloud_farms")
      .select("id")
      .eq("farm_name", farm_name)
      .eq("user_id", user.id)
      .single();

    if (!existing)
      return NextResponse.json({ error: "Farm not found or not yours" }, { status: 404 });

    // تحقق من تكرار الإيميل عالمياً (إذا تغيّر)
    if (game_account) {
      const { data: emailExists } = await service
        .from("cloud_farms")
        .select("id")
        .eq("game_account", game_account)
        .neq("id", existing.id)
        .neq("status", "deleted")
        .single();

      if (emailExists)
        return NextResponse.json(
          { error: "هذا الإيميل مسجّل بالفعل في مزرعة أخرى" },
          { status: 409 }
        );
    }

    const { error } = await service
      .from("cloud_farms")
      .update({
        game_account: game_account || "",
        updated_at: new Date().toISOString(),
      })
      .eq("farm_name", farm_name)
      .eq("user_id", user.id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // سجّل الحدث
    try {
      await service.from("farm_events").insert({
        user_id:    user.id,
        farm_name,
        event_type: "farm_updated",
        message:    `Updated game_account for ${farm_name}`,
        tasks:      [],
      });
    } catch {}

    return NextResponse.json({ ok: true, farm_name, game_account });
  } catch (e: any) {
    console.error("FARMS UPDATE:", e?.message);
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
