import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const enabled = process.env.PAYMENTS_ENABLED === 'true'
  const clientId = process.env.PAYPAL_CLIENT_ID || ''

  return NextResponse.json({
    enabled,
    env: process.env.PAYPAL_ENV ?? 'sandbox',
    clientId: enabled ? clientId : '', // إذا الدفع مقفل، لا نرجّع ID
  })
}
