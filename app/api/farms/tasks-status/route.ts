export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    let userId: string | null = null;

    // Bearer token
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (token && token !== "undefined" && token !== "null") {
      const { data } = await service.auth.getUser(token);
      userId = data?.user?.id || null;
    }

    // Cookies
    if (!userId) {
      try {
        const cookieStore = cookies();
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll: () => cookieStore.getAll(),
              setAll: () => {},
            },
          }
        );
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id || null;
      } catch {}
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // بداية اليوم UTC
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    // جلب أحداث farm_started لليوم الحالي
    const { data: events, error } = await service
      .from("farm_events")
      .select("farm_name, tasks, created_at")
      .eq("user_id", userId)
      .eq("event_type", "farm_started")
      .gte("created_at", todayStart.toISOString());

    if (error) {
      console.error("tasks-status DB error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // تجميع عدد المهام لكل مزرعة
    const farmTasks: Record<string, { tasks_today: number; last_tasks: string[]; last_run: string | null }> = {};

    for (const ev of events || []) {
      const name = ev.farm_name;
      if (!farmTasks[name]) {
        farmTasks[name] = { tasks_today: 0, last_tasks: [], last_run: null };
      }
      const taskCount = Array.isArray(ev.tasks) ? ev.tasks.length : 0;
      farmTasks[name].tasks_today += taskCount;
      // آخر تشغيل
      if (!farmTasks[name].last_run || ev.created_at > farmTasks[name].last_run!) {
        farmTasks[name].last_run = ev.created_at;
        farmTasks[name].last_tasks = Array.isArray(ev.tasks) ? ev.tasks : [];
      }
    }

    const totalTasksToday = Object.values(farmTasks).reduce((s, f) => s + f.tasks_today, 0);

    return NextResponse.json({
      farm_tasks: farmTasks,
      total_tasks_today: totalTasksToday,
      date: todayStart.toISOString().split("T")[0],
    });
  } catch (e: any) {
    console.error("tasks-status error:", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
