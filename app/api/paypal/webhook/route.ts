import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  // حالياً: نجهّز المسار فقط (بدون تفعيل/تحقق)
  const event = await req.json().catch(() => null)

  // لاحقًا:
  // - تحقق التوقيع (Verify webhook signature) باستخدام PAYPAL_WEBHOOK_ID
  // - حدّث Supabase حسب event_type

  return NextResponse.json({ received: true, eventType: event?.event_type ?? null })
}
