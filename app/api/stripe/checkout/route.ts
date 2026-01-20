import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
})

export async function POST(req: Request) {
  try {
    // ✅ اقرأ الـ body كنص أولاً (عشان لا ينفجر req.json)
    const raw = await req.text()
    let data: any = {}
    try {
      data = raw ? JSON.parse(raw) : {}
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const email = data?.email as string | undefined
    const userId = data?.userId as string | undefined

    if (!email || !userId) {
      return NextResponse.json({ error: 'Missing email/userId' }, { status: 400 })
    }

    if (!process.env.STRIPE_PRICE_ID) {
      return NextResponse.json(
        { error: 'Missing STRIPE_PRICE_ID env' },
        { status: 500 }
      )
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],

      // ✅ مهم لربط المستخدم بالاشتراك
      client_reference_id: userId,
      metadata: { userId },
      subscription_data: { metadata: { userId } },

      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancel`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe checkout error:', err)

    const message =
      err?.raw?.message ||
      err?.message ||
      'Unable to create session'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
