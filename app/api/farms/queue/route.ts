export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data } = await supabase.auth.getUser();
    if (data?.user) return { user: data.user, service };
  } catch {}

  return null;
}

export async function GET(req: Request) {
  const auth = await getUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, service } = auth;

  const { data: farms } = await service.from("cloud_farms")
    .select("id, farm_name, status, last_run_at, next_run_at, queue_position, cycle_count")
    .eq("user_id", user.id)
    .neq("status", "deleted")
    .order("queue_position", { ascending: true });

  const { data: serverData } = await service.from("cloud_servers")
    .select("current_farms, max_farms").eq("server_id", "server-01").single();

  return NextResponse.json({
    ok: true,
    farms: farms || [],
    server: {
      current: serverData?.current_farms || 0,
      max: serverData?.max_farms || 200,
      available: (serverData?.max_farms || 200) - (serverData?.current_farms || 0),
    },
  });
}
