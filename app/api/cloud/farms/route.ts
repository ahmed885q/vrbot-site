export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getFarms, getStatus } from "@/lib/orchestrator";

export async function GET() {
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

  try {
    // Get user's farms from Supabase
    const { data: userFarms } = await supabase
      .from("user_farms")
      .select("id,name,server,notes,created_at,cloud_farm_id,cloud_status,cloud_customer_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Try to get cloud farm statuses from orchestrator
    let cloudFarms: any[] = [];
    let cloudOnline = false;
    try {
      const result = await getFarms();
      cloudFarms = result.farms || [];
      cloudOnline = true;
    } catch {
      cloudOnline = false;
    }

    // Merge Supabase farms with cloud status
    const mergedFarms = (userFarms || []).map((farm: any) => {
      const cloudFarm = cloudFarms.find(
        (cf: any) => cf.farm_id === farm.cloud_farm_id || cf.customer_id === farm.cloud_customer_id
      );
      return {
        ...farm,
        cloud: cloudFarm
          ? {
              farm_id: cloudFarm.farm_id,
              status: cloudFarm.status,
              online: true,
            }
          : farm.cloud_farm_id
          ? { farm_id: farm.cloud_farm_id, status: farm.cloud_status || "unknown", online: cloudOnline }
          : null,
      };
    });

    return NextResponse.json({
      ok: true,
      farms: mergedFarms,
      cloud_online: cloudOnline,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}
