export const dynamic = "force-dynamic";
// app/api/stripe/checkout/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, )

export async function POST(req: Request) {
  try {
    // لازم زرّك يرسل JSON
    const { email, userId } = await req.json()

    // ✅ تحقق قبل إنشاء الـ session
    if (!email || !userId) {
      return NextResponse.json({ error: 'Missing email/userId' }, { status: 400 })
    }
    if (!process.env.STRIPE_PRICE_ID) {
      return NextResponse.json(
        { error: 'Missing STRIPE_PRICE_ID env' },
        { status: 500 }
      )
    }
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_APP_URL env' },
        { status: 500 }
      )
    }

    // ✅ إنشاء الـ session (بالضبط مثل طلبك)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',

      customer_email: email,

      client_reference_id: userId,

      metadata: {
        userId,
      },

      subscription_data: {
        metadata: {
          userId, // ⭐ هذا السطر هو المفتاح
        },
      },

      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],

      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe checkout error:', err)

    const message = err?.raw?.message || err?.message || 'Unable to create session'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
