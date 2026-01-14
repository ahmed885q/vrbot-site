import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_REQUESTS = 20;
const WINDOW_MS = 60 * 1000;

export async function rateLimit(ip: string) {
  const now = new Date();

  const { data } = await supabaseAdmin
    .from("rate_limits")
    .select("*")
    .eq("ip", ip)
    .single();

  if (!data) {
    await supabaseAdmin.from("rate_limits").insert({
      ip,
      count: 1,
      last_request: now,
    });
    return;
  }

  const last = new Date(data.last_request);
  const diff = now.getTime() - last.getTime();

  if (diff > WINDOW_MS) {
    await supabaseAdmin
      .from("rate_limits")
      .update({ count: 1, last_request: now })
      .eq("ip", ip);
    return;
  }

  if (data.count >= MAX_REQUESTS) {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }

  await supabaseAdmin
    .from("rate_limits")
    .update({ count: data.count + 1 })
    .eq("ip", ip);
}
