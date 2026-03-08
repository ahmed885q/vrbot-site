export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseService } from "@/lib/supabase/server";
import { provisionFarms, getProvisionStatus } from "@/lib/orchestrator";

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
  const { farm_id } = body;

  if (!farm_id)
    return NextResponse.json({ error: "Missing farm_id" }, { status: 400 });

  // Verify farm belongs to user
  const { data: farm, error: farmError } = await supabase
    .from("user_farms")
    .select("id,name,server,notes,cloud_farm_id,cloud_customer_id")
    .eq("id", farm_id)
    .eq("user_id", user.id)
    .single();

  if (farmError || !farm)
    return NextResponse.json({ error: "Farm not found" }, { status: 404 });

  if (farm.cloud_farm_id)
    return NextResponse.json({ error: "Farm already provisioned on cloud", cloud_farm_id: farm.cloud_farm_id }, { status: 409 });

  try {
    // Provision on orchestrator
    const result = await provisionFarms({
      customerEmail: user.email || "",
      customerName: user.user_metadata?.name || user.email?.split("@")[0] || "User",
      plan: "basic",
      farmCount: 1,
      nifling: false,
      orderId: `cloud-${farm_id}-${Date.now()}`,
    });

    if (!result.success && !result.job_id) {
      return NextResponse.json(
        { error: "Orchestrator provisioning failed", details: result },
        { status: 502 }
      );
    }

    // Update the Supabase farm with cloud info
    const service = supabaseService();
    await service
      .from("user_farms")
      .update({
        cloud_customer_id: result.customer_id || null,
        cloud_job_id: result.job_id || null,
        cloud_status: "provisioning",
      })
      .eq("id", farm_id);

    return NextResponse.json({
      ok: true,
      job_id: result.job_id,
      customer_id: result.customer_id,
      status: "provisioning",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Cloud server unreachable", details: error?.message },
      { status: 502 }
    );
  }
}

// GET - Check provision status
export async function GET(req: Request) {
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
  const jobId = url.searchParams.get("job_id");

  if (!jobId)
    return NextResponse.json({ error: "Missing job_id" }, { status: 400 });

  try {
    const status = await getProvisionStatus(jobId);

    // If provisioning is complete, update the farm in Supabase
    if (status.status === "completed" || status.farms_ready > 0) {
      const service = supabaseService();
      await service
        .from("user_farms")
        .update({
          cloud_status: "active",
          cloud_farm_id: status.farms_created > 0 ? status.farms_ready : null,
        })
        .eq("cloud_job_id", jobId);
    }

    return NextResponse.json({ ok: true, ...status });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Cloud server unreachable", details: error?.message },
      { status: 502 }
    );
  }
}
