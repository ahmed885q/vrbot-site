import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const userId = body?.userId as string | undefined

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // نجيب stripe_customer_id من جدول subscriptions
    const { data: sub, error } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const customerId = sub?.stripe_customer_id
    if (!customerId) {
      return NextResponse.json({ error: 'No stripe_customer_id for this user' }, { status: 400 })
    }

    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Portal error:', err)
    return NextResponse.json({ error: err?.message || 'Portal failed' }, { status: 500 })
  }
}
