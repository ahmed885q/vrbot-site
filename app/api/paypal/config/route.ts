export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const enabled = process.env.PAYPAL_ENABLED === 'true'
  const env = process.env.PAYPAL_ENV || 'sandbox'
  const clientId = enabled ? (process.env.PAYPAL_CLIENT_ID || '') : ''
  return NextResponse.json({ enabled, env, clientId })
}
