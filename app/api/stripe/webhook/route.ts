import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !secret) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const sub = event.data.object as Stripe.Subscription

      const customerId =
        typeof sub.customer === 'string' ? sub.customer : sub.customer.id

      const subscriptionId = sub.id
      const status = sub.status

      const priceId =
        sub.items.data[0]?.price?.id ?? null

    const currentPeriodEnd =
  typeof (sub as any).current_period_end === 'number'
    ? new Date((sub as any).current_period_end * 1000).toISOString()
    : null



      const userId = sub.metadata?.userId

      if (!userId) {
        console.warn('No userId in subscription metadata')
        return NextResponse.json({ ok: true })
      }

      await supabaseAdmin
        .from('subscriptions')
        .upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status,
            price_id: priceId,
            current_period_end: currentPeriodEnd,
          },
          { onConflict: 'user_id' }
        )
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
