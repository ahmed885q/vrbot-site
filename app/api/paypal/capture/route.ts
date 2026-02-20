export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  const enabled = process.env.PAYPAL_ENABLED === 'true'
  if (!enabled) {
    return NextResponse.json(
      { error: 'PayPal is disabled for now (launch later).' },
      { status: 403 }
    )
  }

  // لاحقاً: Capture order
  return NextResponse.json({ error: 'Not implemented yet' }, { status: 501 })
}
