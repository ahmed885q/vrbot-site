export const dynamic = "force-dynamic";
// app/api/ai/chat/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const message = String(body?.message ?? '').trim()

  const reply =
    message.length === 0
      ? 'Ask me a question about farming/build/rally planning.'
      : `Plan idea:\n- Focus on economy + requirements.\n- Keep marches gathering resources.\n- Queue upgrades before sleep.\n\nYou asked: "${message}"\n(Connect me to a real AI later for smarter answers.)`

  return NextResponse.json({ ok: true, reply })
}
