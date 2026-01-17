import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

import { supabaseAdmin } from '../../../../lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)


export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new NextResponse('Missing signature', { status: 400 })
  }

  let event: Stripe.Event

  try {
    const body = await req.text()

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err)
    return new NextResponse('Invalid signature', { status: 400 })
  }

  // ✅ نجاح الاشتراك
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const userId = session.metadata?.user_id
    const subscriptionId = session.subscription as string
    const customerId = session.customer as string

    if (!userId) {
      console.error('❌ Missing user_id in metadata')
      return new NextResponse('Missing user_id', { status: 400 })
    }

    // 🔥 ترقية المستخدم إلى Pro
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        role: 'pro',
        subscription_status: 'active',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId
      })
      .eq('id', userId)

    if (error) {
      console.error('❌ Failed to upgrade user:', error)
      return new NextResponse('Database error', { status: 500 })
    }

    console.log(`✅ User ${userId} upgraded to PRO`)
  }

  return NextResponse.json({ received: true })
}
