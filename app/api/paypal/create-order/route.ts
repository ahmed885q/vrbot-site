import { NextResponse } from 'next/server'
import { assertPaymentsEnabled, getPayPalAccessToken, getPayPalBaseUrl } from '@/lib/paypal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    // ✅ الآن مقفّل (لا دفع)
    assertPaymentsEnabled()

    const body = await req.json().catch(() => ({}))
    const plan = body?.plan ?? 'pro'

    // لاحقاً: اربط الخطة بالسعر
    const amount = plan === 'pro' ? '2.00' : '0.00'
    const currency = 'USD'

    const token = await getPayPalAccessToken()
    const base = getPayPalBaseUrl()

    const res = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: { currency_code: currency, value: amount },
            description: `VRBOT ${plan.toUpperCase()} plan`,
          },
        ],
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: text }, { status: 400 })
    }

    const order = await res.json()
    return NextResponse.json({ id: order.id })
  } catch (e: any) {
    const status = e?.status ?? 500
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status })
  }
}
