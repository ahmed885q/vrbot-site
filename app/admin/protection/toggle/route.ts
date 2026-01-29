import { NextResponse } from "next/server"
// Remove the import of createSupabaseAdminClient
// import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@supabase/supabase-js"
import { adminGuardApi } from "@/lib/admin_guard_api"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const ok = await adminGuardApi()
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const enabled = String(form.get("enabled") ?? "false") === "true"

  // Create the Supabase admin client directly
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin
    .from("anti_detection_settings")
    .upsert(
      {
        setting_key: "system_enabled",
        setting_name: "Anti Detection Enabled",
        setting_value: enabled ? "true" : "false",
        value_type: "boolean",
        category: "general",
      },
      { onConflict: "setting_key" }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.redirect(new URL("/admin/protection", req.url))
}