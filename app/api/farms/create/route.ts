export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
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
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const igg_email = String(body?.igg_email ?? "").trim() || null;
    const igg_password = String(body?.igg_password ?? "").trim() || null;

    if (!name) {
      return NextResponse.json({ error: "Missing farm name" }, { status: 400 });
    }

    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: farm, error } = await service
      .from("cloud_farms")
      .insert({
        user_id: user.id,
        farm_name: name,
        server_id: "server-01",
        game_account: igg_email || "",
        status: "provisioning",
      })
      .select("id, farm_name, server_id, created_at, status")
      .single();

    if (error) {
      console.error("FARM INSERT ERROR:", JSON.stringify(error));
      return NextResponse.json(
        { error: error.message, details: error.details, code: error.code },
        { status: 500 }
      );
    }

    if (igg_email && igg_password) {
      const hetznerUrl = `http://${process.env.HETZNER_IP || "88.99.64.19"}:8888/api/farms/login`;
      fetch(hetznerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.VRBOT_API_KEY || "",
        },
        body: JSON.stringify({
          user_id: user.id,
          nickname: name,
          igg_email,
          igg_password,
        }),
      })
        .then(async (r) => {
          const d = await r.json().catch(() => ({}));
          if (d.android_id) {
            await service
              .from("cloud_farms")
              .update({ status: "running", game_account: igg_email })
              .eq("id", farm.id);
          }
        })
        .catch((e) => console.error("Hetzner login error:", e));
    }

    return NextResponse.json({
      ok: true,
      farm,
      tokens_remaining: 999,
      cloud: { status: "provisioning" },
      agent: null,
    });
  } catch (e: any) {
    console.error("FARMS CREATE EXCEPTION:", e?.message);
    return NextResponse.json(
      { error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}
