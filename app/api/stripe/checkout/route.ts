import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST() {
  const supabase = createSupabaseServerClient()
  const { data: auth, error: authErr } = await supabase.auth.getUser()

  if (authErr || !auth?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = auth.user
  const userId = user.id
  const email = user.email ?? undefined

  const priceId = process.env.STRIPE_PRICE_PRO
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!priceId || !appUrl) {
    return NextResponse.json(
      { error: 'Missing STRIPE_PRICE_PRO or NEXT_PUBLIC_APP_URL' },
      { status: 500 }
    )
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=cancel`,
    customer_email: email, // اختياري
    client_reference_id: userId, // ✅ الربط الأساسي
    metadata: { userId }, // ✅ احتياط
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
