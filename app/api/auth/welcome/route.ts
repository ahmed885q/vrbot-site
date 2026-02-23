export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
    await sendWelcomeEmail(email);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[Welcome] Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
