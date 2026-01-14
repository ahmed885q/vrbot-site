import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { validateSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
})

export async function POST(req: NextRequest) {
  // 1️⃣ التحقق من الجلسة
  const token =
    req.cookies.get('session_token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessionData = await validateSession(token)
  if (!sessionData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = sessionData.user_id

  // 2️⃣ إنشاء Stripe Checkout
  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: process.env.STRIPE_PRICE_PRO!,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing`,
    metadata: {
      userId,
    },
  })

  return NextResponse.json({ url: checkout.url })
}
